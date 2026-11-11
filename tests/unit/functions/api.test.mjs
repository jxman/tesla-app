import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../netlify/functions/api.mjs";
import { parseFeed, mergeArticles, safeHttpUrl } from "../../../netlify/lib/news.mjs";
import { selectCandidates, buildGeoapifyUrl, featureToElement } from "../../../netlify/lib/places.mjs";
import { summarizeRoute } from "../../../netlify/lib/traffic.mjs";
import { PLACE_CATEGORIES } from "../../../src/shared/placeCategories.js";

const call = (path, init) => handler(new Request(`https://example.test${path}`, init));
const jsonResp = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("router", () => {
  it("404s unknown routes, including prototype keys", async () => {
    expect((await call("/api/nope")).status).toBe(404);
    expect((await call("/api/constructor")).status).toBe(404);
  });

  it("rejects non-GET methods", async () => {
    expect((await call("/api/weather", { method: "POST" })).status).toBe(405);
  });
});

describe("/api/weather", () => {
  it("validates coordinates before calling upstream", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "k");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const resp = await call("/api/weather?lat=999&lon=0");
    expect(resp.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rounds coords, combines both payloads and sets CDN cache headers", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "secret-key");
    const fetchMock = vi.fn(async (url) =>
      jsonResp(url.includes("/forecast") ? { list: [] } : { cod: 200, name: "Boston" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resp = await call("/api/weather?lat=42.364506&lon=-71.038887");
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ current: { cod: 200, name: "Boston" }, forecast: { list: [] } });
    expect(fetchMock.mock.calls[0][0]).toContain("lat=42.36&lon=-71.04");
    expect(resp.headers.get("Netlify-CDN-Cache-Control")).toMatch(/durable, max-age=600/);
    expect(resp.headers.get("Netlify-Vary")).toBe("query=lat|lon");
  });

  it("never leaks the API key in error responses", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResp({ message: "bad key" }, 401)));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const resp = await call("/api/weather?lat=1&lon=1");
    expect(resp.status).toBe(502);
    expect(resp.headers.get("Cache-Control")).toBe("no-store");
    expect(await resp.text()).not.toContain("secret-key");
  });

  it("fails clearly when the key is not configured", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const resp = await call("/api/weather?lat=1&lon=1");
    expect(resp.status).toBe(500);
    expect((await resp.json()).error).toMatch(/not configured/);
  });
});

describe("/api/geocode", () => {
  it("rejects malformed zip codes", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "k");
    expect((await call("/api/geocode?zip=%3Cscript%3E")).status).toBe(400);
  });

  it("maps upstream 404 to a 422", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResp({ cod: "404" }, 404)));
    expect((await call("/api/geocode?zip=00000")).status).toBe(422);
  });
});

describe("news parsing", () => {
  const rss = `<?xml version="1.0"?>
  <rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
    <item><title>Story &amp; More</title><link>https://a.example/1</link>
      <pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate>
      <media:content url="https://img.example/1.jpg" medium="image"/></item>
    <item><title>Bad link</title><link>javascript:alert(1)</link></item>
    <item><title>Img in description</title><link>https://a.example/2</link>
      <description><![CDATA[<p><img src="https://img.example/2.jpg"/></p>]]></description></item>
  </channel></rss>`;
  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title type="html">Atom &lt;b&gt;story&lt;/b&gt;</title>
      <link rel="alternate" href="https://b.example/x"/><published>2026-11-10T12:00:00Z</published></entry>
  </feed>`;

  it("parses RSS items, images and drops unsafe links", () => {
    const items = parseFeed(rss, "NYT");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "Story & More", url: "https://a.example/1", imageUrl: "https://img.example/1.jpg", source: "NYT" });
    expect(items[1].imageUrl).toBe("https://img.example/2.jpg");
  });

  it("parses Atom entries and strips HTML from titles", () => {
    expect(parseFeed(atom, "Verge")[0]).toMatchObject({ title: "Atom story", url: "https://b.example/x" });
  });

  it("merges newest first and de-duplicates", () => {
    const merged = mergeArticles([parseFeed(rss, "NYT"), parseFeed(atom, "Verge"), parseFeed(atom, "Verge")]);
    expect(merged.map((a) => a.title)).toEqual(["Atom story", "Story & More", "Img in description"]);
  });

  it("accepts only http(s) URLs", () => {
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("https://ok.example/a")).toBe("https://ok.example/a");
  });

  it("returns 502 when every feed fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const resp = await call("/api/news?category=science");
    expect(resp.status).toBe(502);
    expect((await resp.json()).retryable).toBe(true);
  });

  it("rejects unknown categories", async () => {
    expect((await call("/api/news?category=weather")).status).toBe(400);
  });
});

describe("/api/places", () => {
  const feature = (props, raw) => ({ type: "Feature", properties: { ...props, datasource: { sourcename: "openstreetmap", raw } } });
  const features = [
    feature({ name: "Far", lat: 42.37, lon: -71.04 }, { osm_type: "n", osm_id: 1, name: "Far", amenity: "cafe", secret_tag: "x" }),
    feature({ name: "Near", lat: 42.365, lon: -71.039, street: "Main St", housenumber: "5" }, { osm_type: "w", osm_id: 2, name: "Near", amenity: "cafe", opening_hours: "24/7" }),
    feature({ lat: 42.365, lon: -71.039 }, { osm_type: "n", osm_id: 3, amenity: "cafe" }),
    feature({ name: "Gone", lat: 42.365, lon: -71.039 }, { osm_type: "n", osm_id: 4, name: "Gone", "disused:amenity": "cafe" }),
  ];

  it("maps Geoapify features to OSM-style elements", () => {
    expect(featureToElement(features[1])).toMatchObject({
      type: "way", id: 2, lat: 42.365, lon: -71.039,
      tags: { name: "Near", amenity: "cafe", opening_hours: "24/7", "addr:street": "Main St", "addr:housenumber": "5" },
    });
  });

  it("keeps named live places, trims tags, sorts by distance", () => {
    const out = selectCandidates(features.map(featureToElement), 42.365, -71.039);
    expect(out.map((p) => p.tags.name)).toEqual(["Near", "Far"]);
    expect(out[1].tags).not.toHaveProperty("secret_tag");
    expect(out[1].tags).not.toHaveProperty("addr:street"); // empty values dropped
  });

  it("builds a Geoapify request from the shared category definition", () => {
    const url = new URL(buildGeoapifyUrl(42.365, -71.039, PLACE_CATEGORIES.find((c) => c.id === "charging"), "k"));
    expect(url.searchParams.get("categories")).toBe("service.vehicle.charging_station");
    expect(url.searchParams.get("filter")).toBe("circle:-71.039,42.365,16000");
    expect(url.searchParams.get("bias")).toBe("proximity:-71.039,42.365");
  });

  it("rejects unknown categories without calling upstream", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "k");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call("/api/places?lat=42&lon=-71&cat=gas")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns places with ETAs", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "geo-secret");
    const fetchMock = vi.fn(async (url) =>
      url.includes("geoapify")
        ? jsonResp({ type: "FeatureCollection", features })
        : jsonResp({ durations: [[0, 120, 300]] }) // OSRM
    );
    vi.stubGlobal("fetch", fetchMock);
    const resp = await call("/api/places?lat=42.365&lon=-71.039&cat=restaurants");
    expect(resp.status).toBe(200);
    const { places } = await resp.json();
    expect(places.map((p) => [p.tags.name, p.etaMinutes])).toEqual([["Near", 2], ["Far", 5]]);
    expect(resp.headers.get("Netlify-Vary")).toBe("query=lat|lon|cat");
  });

  it("never leaks the Geoapify key in error responses", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "geo-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => jsonResp({ message: "Invalid apiKey" }, 401)));
    const resp = await call("/api/places?lat=42.365&lon=-71.039&cat=restaurants");
    expect(resp.status).toBe(502);
    expect(await resp.text()).not.toContain("geo-secret");
  });

  it("fails clearly when the key is not configured", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    const resp = await call("/api/places?lat=42.365&lon=-71.039&cat=restaurants");
    expect(resp.status).toBe(500);
    expect((await resp.json()).error).toMatch(/not configured/);
  });
});

describe("traffic card routes", () => {
  it("/api/incidents normalizes, ranks by severity then distance, and keeps the key out of the URL", async () => {
    vi.stubEnv("TOMTOM_API_KEY", "tt-secret");
    const incidentsResp = {
      incidents: [
        { geometry: { type: "Point", coordinates: [-71.03, 42.37] },
          properties: { id: "a", iconCategory: "roadWorks", magnitudeOfDelay: "minor", events: [{ description: "Roadworks" }], roadNumbers: ["I-93"], delayInSeconds: 60 } },
        { geometry: { type: "LineString", coordinates: [[-71.5, 42.6], [-71.1, 42.4]] },
          properties: { id: "b", iconCategory: "accident", magnitudeOfDelay: "major", events: [{ description: "Crash" }], from: "Exit 15", to: "Exit 16", delayInSeconds: 600 } },
      ],
    };
    const fetchMock = vi.fn(async () => jsonResp(incidentsResp));
    vi.stubGlobal("fetch", fetchMock);

    const resp = await call("/api/incidents?lat=42.36&lon=-71.04");
    expect(resp.status).toBe(200);
    const { incidents } = await resp.json();
    expect(incidents.map((i) => i.id)).toEqual(["b", "a"]);
    expect(incidents[0]).toMatchObject({ title: "Crash", category: "accident", delayMin: 10, from: "Exit 15", to: "Exit 16" });
    expect(incidents[1]).toMatchObject({ road: "I-93", delayMin: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain("tt-secret");
    expect(init.headers["TomTom-Api-Key"]).toBe("tt-secret");
    expect(new URL(url).searchParams.get("bbox").split(",")).toHaveLength(4);
  });

  it("/api/drive-times returns per-destination results in order and survives one failure", async () => {
    vi.stubEnv("TOMTOM_API_KEY", "tt-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async (url, init) => {
      const { destination } = JSON.parse(init.body).routePlanningLocations;
      if (destination.coordinates[1] === 42.1) return new Response("no route", { status: 400 });
      return jsonResp({ routes: [{ summary: { travelDurationInSeconds: 1380, trafficDelayDurationInSeconds: 360, lengthInMeters: 19956 } }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const resp = await call("/api/drive-times?lat=42.24&lon=-71.21&to=42.36,-71.06;42.1,-71.2;42.24,-71.21");
    expect(resp.status).toBe(200);
    const { routes } = await resp.json();
    expect(routes[0]).toEqual({ minutes: 23, delayMin: 6, noTrafficMin: null, miles: 12.4 });
    expect(routes[1].error).toBeTruthy();
    expect(routes[2]).toMatchObject({ here: true, minutes: 0 }); // same spot: no API call
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).not.toContain("tt-secret");
    expect(fetchMock.mock.calls[0][1].headers["TomTom-Api-Key"]).toBe("tt-secret");
    expect(resp.headers.get("Netlify-Vary")).toBe("query=lat|lon|to");
    expect(await call("/api/drive-times?lat=42&lon=-71&to=1,2;3,4;5,6;7,8;9,10;11,12").then((r) => r.status)).toBe(400);
  });

  it("/api/drive-times fails the whole request when the key is rejected", async () => {
    vi.stubEnv("TOMTOM_API_KEY", "tt-secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => jsonResp({}, 403)));
    const resp = await call("/api/drive-times?lat=42.24&lon=-71.21&to=42.36,-71.06");
    expect(resp.status).toBe(502);
    expect(await resp.text()).not.toContain("tt-secret");
  });

  it("summarizeRoute accepts legacy v1 field names too", () => {
    expect(summarizeRoute({ travelTimeInSeconds: 600, trafficDelayInSeconds: 120, noTrafficTravelTimeInSeconds: 480, lengthInMeters: 8047 }))
      .toEqual({ minutes: 10, delayMin: 2, noTrafficMin: 8, miles: 5 });
    expect(summarizeRoute({})).toBeNull();
  });

  it("/api/search validates length and maps Geoapify results", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "geo");
    expect((await call("/api/search?text=ab")).status).toBe(400);
    vi.stubGlobal("fetch", vi.fn(async () => jsonResp({
      results: [{ address_line1: "1 Patriot Pl", address_line2: "Foxborough, MA 02035, United States of America", lat: 42.090891, lon: -71.264171 }],
    })));
    const { results } = await (await call("/api/search?text=gillette&lat=42.2&lon=-71.2")).json();
    expect(results).toEqual([{ label: "1 Patriot Pl", detail: "Foxborough, MA 02035", lat: 42.09089, lon: -71.26417 }]);
  });

  it("reports missing TomTom configuration clearly", async () => {
    vi.stubEnv("TOMTOM_API_KEY", "");
    const resp = await call("/api/incidents?lat=42.36&lon=-71.04");
    expect(resp.status).toBe(500);
    expect((await resp.json()).error).toMatch(/not configured/);
  });
});
