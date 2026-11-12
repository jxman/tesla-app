import { HttpError, fetchWithTimeout, haversineMi, json, parseCoord } from "./http.mjs";

// Traffic card data:
//   /api/incidents   — TomTom Traffic Incident Details (Orbis v2) around the user
//   /api/drive-times — TomTom Orbis Routing v3 (routes/calculate, live traffic) to saved places
//   /api/search      — Geoapify autocomplete: addresses (adding a saved place) or,
//                      with type=city, US towns (Change location)
// Saved places live only in the browser (localStorage); the server never stores them.

const TOMTOM_INCIDENTS_URL = "https://api.tomtom.com/maps/orbis/traffic/incidents/details";
const TOMTOM_ROUTE_URL = "https://api.tomtom.com/maps/orbis/routing/routes/calculate";
const GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

const INCIDENT_RADIUS_KM = 16; // ~10 mi; bbox ≈ 32×32 km, well under TomTom's 10,000 km² cap
export const MAX_INCIDENTS = 6;
export const MAX_DESTINATIONS = 5;

function requireEnv(env, name, label) {
  const key = env[name];
  if (!key) throw new HttpError(500, `${label} is not configured`);
  return key;
}

async function upstreamJson(url, init, label) {
  let resp;
  try {
    resp = await fetchWithTimeout(url, { timeoutMs: 6000, ...init });
  } catch {
    throw new HttpError(504, `${label} timed out. Please try again.`, { retryable: true });
  }
  if (resp.status === 401 || resp.status === 403) {
    console.error(`${label} rejected the API key (${resp.status})`);
    throw new HttpError(502, `${label} is misconfigured`);
  }
  if (resp.status === 429) throw new HttpError(503, `${label} is busy. Please try again.`, { retryable: true });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(`${label} HTTP ${resp.status}: ${detail.slice(0, 300)}`);
    throw new HttpError(502, `${label} error. Please try again.`, { retryable: true });
  }
  return resp.json();
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export function bboxAround(lat, lon, radiusKm) {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const r = (n) => Number(n.toFixed(4));
  return [r(lon - dLon), r(lat - dLat), r(lon + dLon), r(lat + dLat)].join(",");
}

const MAGNITUDE_RANK = { major: 4, undefined: 3, moderate: 2, minor: 1, unknown: 0 };

/** Nearest [lon, lat] of a Point / LineString geometry to the user. */
function nearestPoint(geometry, lat, lon) {
  if (!geometry?.coordinates) return null;
  const coords = geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates;
  let best = null;
  let bestD = Infinity;
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const d = haversineMi(lat, lon, c[1], c[0]);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ? { lat: best[1], lon: best[0], distanceMi: bestD } : null;
}

const MAX_PATH_POINTS = 60;

/**
 * Incident geometry → [[lat, lon], …] for the details map: evenly thinned to
 * at most MAX_PATH_POINTS (TomTom sends up to ~300), keeping both ends.
 */
export function simplifyPath(geometry) {
  if (!geometry?.coordinates) return [];
  const coords = (geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates)
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));
  const step = Math.max(1, Math.ceil((coords.length - 1) / (MAX_PATH_POINTS - 1)));
  const picked = coords.filter((_, i) => i % step === 0);
  if (coords.length > 1 && picked[picked.length - 1] !== coords[coords.length - 1]) picked.push(coords[coords.length - 1]);
  return picked.map(([lo, la]) => [Number(la.toFixed(5)), Number(lo.toFixed(5))]);
}

/** TomTom incident features → compact, display-ready incidents, most important first. */
export function normalizeIncidents(features, lat, lon) {
  return (features || [])
    .map((f) => {
      const p = f.properties || {};
      const at = nearestPoint(f.geometry, lat, lon);
      if (!at) return null;
      const descriptions = [...new Set((p.events || []).map((e) => e?.description).filter(Boolean))];
      const description = descriptions[0] || null;
      return {
        id: p.id ?? null,
        category: p.iconCategory || "unknown",
        magnitude: p.magnitudeOfDelay || "unknown",
        title: description || humanize(p.iconCategory) || "Traffic incident",
        road: p.roadNumbers?.[0] || null,
        from: p.from || null,
        to: p.to || null,
        delayMin: p.delayInSeconds > 0 ? Math.round(p.delayInSeconds / 60) : null,
        lengthMi: p.lengthInMeters > 0 ? Number((p.lengthInMeters / 1609.34).toFixed(1)) : null,
        distanceMi: Number(at.distanceMi.toFixed(1)),
        lat: at.lat,
        lon: at.lon,
        // Details sheet
        details: descriptions.slice(1),
        startTime: p.startTime || null,
        endTime: p.endTime || null,
        lastReportTime: p.lastReportTime || null,
        reports: p.numberOfReports > 0 ? p.numberOfReports : null,
        probability: p.probabilityOfOccurrence || null,
        path: simplifyPath(f.geometry),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        (MAGNITUDE_RANK[b.magnitude] ?? 0) - (MAGNITUDE_RANK[a.magnitude] ?? 0) ||
        a.distanceMi - b.distanceMi
    )
    .slice(0, MAX_INCIDENTS);
}

function humanize(s) {
  return s ? s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (c) => c.toUpperCase()) : null;
}

/** GET /api/incidents?lat&lon → { incidents: [...] } */
export async function incidents(params, env = process.env) {
  const lat = parseCoord(params, "lat", -90, 90, 2);
  const lon = parseCoord(params, "lon", -180, 180, 2);
  const key = requireEnv(env, "TOMTOM_API_KEY", "Traffic service");

  const qs = new URLSearchParams({
    apiVersion: "2",
    bbox: bboxAround(lat, lon, INCIDENT_RADIUS_KM),
    timeValidity: "present",
  });
  const data = await upstreamJson(
    `${TOMTOM_INCIDENTS_URL}?${qs}`,
    {
      headers: {
        "TomTom-Api-Key": key,
        "TomTom-Api-Version": "2",
        "Accept-Language": "en-US",
        Accept: "application/json",
        Attributes:
          "incidents(geometry(type,coordinates),properties(id,iconCategory,magnitudeOfDelay,events(description),from,to,delayInSeconds,lengthInMeters,roadNumbers,startTime,endTime,lastReportTime,numberOfReports,probabilityOfOccurrence))",
      },
    },
    "Traffic service"
  );

  return json(
    { incidents: normalizeIncidents(data.incidents, lat, lon) },
    { cache: { cdn: 120, swr: 120, browser: 60, vary: ["lat", "lon"] } }
  );
}

// ─── Drive times ──────────────────────────────────────────────────────────────

/** Parses `to=lat,lon;lat,lon` (max MAX_DESTINATIONS), rounding to 4 dp (~11 m). */
export function parseDestinations(raw) {
  const parts = (raw || "").split(";").filter(Boolean);
  if (!parts.length || parts.length > MAX_DESTINATIONS) {
    throw new HttpError(400, `"to" must list 1–${MAX_DESTINATIONS} destinations`);
  }
  return parts.map((p) => {
    const [la, lo] = p.split(",").map(Number);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      throw new HttpError(400, 'Invalid destination in "to"');
    }
    return { lat: Number(la.toFixed(4)), lon: Number(lo.toFixed(4)) };
  });
}

/** Reads a summary duration under either Orbis v3 or legacy v1 field names. */
const secs = (summary, ...names) => {
  for (const n of names) if (Number.isFinite(summary?.[n])) return summary[n];
  return null;
};

/** TomTom route summary → { minutes, delayMin, noTrafficMin, miles } */
export function summarizeRoute(s) {
  const travel = secs(s, "travelDurationInSeconds", "travelTimeInSeconds");
  if (travel == null) return null;
  const delay = secs(s, "trafficDelayDurationInSeconds", "trafficDelayInSeconds") ?? 0;
  const noTraffic = secs(s, "noTrafficTravelDurationInSeconds", "noTrafficTravelTimeInSeconds");
  return {
    minutes: Math.round(travel / 60),
    delayMin: Math.round(delay / 60),
    noTrafficMin: noTraffic != null ? Math.round(noTraffic / 60) : null,
    miles: Number(((s.lengthInMeters || 0) / 1609.34).toFixed(1)),
  };
}

async function driveTime(key, origin, dest) {
  // Already there (or close enough that routing is meaningless)
  if (haversineMi(origin.lat, origin.lon, dest.lat, dest.lon) < 0.15) {
    return { minutes: 0, delayMin: 0, noTrafficMin: 0, miles: 0, here: true };
  }
  try {
    const data = await upstreamJson(
      TOMTOM_ROUTE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "TomTom-Api-Key": key,
          "TomTom-Api-Version": "3",
          Attributes: "routes.summary",
          Accept: "application/json",
        },
        body: JSON.stringify({
          routePlanningLocations: {
            origin: { type: "Point", coordinates: [origin.lon, origin.lat] },
            destination: { type: "Point", coordinates: [dest.lon, dest.lat] },
          },
          routeType: "fast",
          traffic: "live",
          travelMode: "car",
        }),
      },
      "Routing service"
    );
    return summarizeRoute(data.routes?.[0]?.summary) ?? { error: "No route found" };
  } catch (err) {
    // One bad destination shouldn't blank the whole card; fail the request only
    // for configuration problems that affect every destination.
    if (err instanceof HttpError && err.status === 502 && /misconfigured/.test(err.message)) throw err;
    return { error: err instanceof HttpError ? err.message : "Route unavailable" };
  }
}

/** GET /api/drive-times?lat&lon&to=lat,lon;lat,lon → { routes: [{ minutes, delayMin, ... } | { error }] } */
export async function driveTimes(params, env = process.env) {
  const origin = {
    lat: parseCoord(params, "lat", -90, 90, 3),
    lon: parseCoord(params, "lon", -180, 180, 3),
  };
  const dests = parseDestinations(params.get("to"));
  const key = requireEnv(env, "TOMTOM_API_KEY", "Routing service");

  const routes = await Promise.all(dests.map((d) => driveTime(key, origin, d)));
  return json(
    { routes },
    { cache: { cdn: 120, swr: 120, browser: 60, vary: ["lat", "lon", "to"] } }
  );
}

// ─── Address search (for adding saved places) ─────────────────────────────────

/**
 * GET /api/search?text[&type=city][&lat&lon] → { results: [{ label, detail, lat, lon }] }
 * type=city: US towns and cities only, labelled "Medfield, MA" (Change location box).
 */
export async function search(params, env = process.env) {
  const text = (params.get("text") || "").trim();
  if (text.length < 3 || text.length > 120) throw new HttpError(400, "Search text must be 3–120 characters");
  const type = params.get("type") || null;
  if (type !== null && type !== "city") throw new HttpError(400, "Unknown search type");
  const key = requireEnv(env, "GEOAPIFY_API_KEY", "Address search");

  const qs = new URLSearchParams({ text, limit: type === "city" ? "8" : "5", format: "json", lang: "en", apiKey: key });
  if (type === "city") {
    qs.set("type", "city");
    qs.set("filter", "countrycode:us");
  }
  // Optional proximity bias (rounded to ~11 km so it doesn't fragment the cache)
  if (params.get("lat") && params.get("lon")) {
    const lat = parseCoord(params, "lat", -90, 90, 1);
    const lon = parseCoord(params, "lon", -180, 180, 1);
    qs.set("bias", `proximity:${lon},${lat}`);
  }

  const data = await upstreamJson(`${GEOAPIFY_AUTOCOMPLETE_URL}?${qs}`, {}, "Address search");
  const seen = new Set();
  const results = (data.results || [])
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon))
    // Towns: Geoapify also returns suburbs labelled with their parent city
    // ("Medfield" in Baltimore → "Baltimore, MD"); MA towns can be "district"
    .filter((r) => type !== "city" || r.result_type === "city" || r.result_type === "district")
    .map((r) => type === "city"
      ? {
          label: [r.city || r.name, r.state_code].filter(Boolean).join(", ") || r.formatted,
          detail: r.county || null,
          lat: Number(r.lat.toFixed(5)),
          lon: Number(r.lon.toFixed(5)),
        }
      : {
          label: r.address_line1 || r.name || r.formatted,
          detail: r.address_line2 ? r.address_line2.replace(/, United States of America$/, "") : null,
          lat: Number(r.lat.toFixed(5)),
          lon: Number(r.lon.toFixed(5)),
        })
    // The same town can come back twice (town and village boundaries)
    .filter((r) => (seen.has(r.label) ? false : seen.add(r.label)))
    .slice(0, 5);

  return json(
    { results },
    { cache: { cdn: 86400, swr: 86400, browser: 3600, vary: ["text", "type", "lat", "lon"] } }
  );
}
