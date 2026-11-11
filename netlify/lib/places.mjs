import { PLACE_CATEGORIES, PLACE_CATEGORY_IDS } from "../../src/shared/placeCategories.js";
import { HttpError, fetchWithTimeout, haversineMi, json, parseCoord, parseEnum } from "./http.mjs";

// Place search uses the Geoapify Places API (OpenStreetMap data, API key kept
// server-side). It replaced the public Overpass API, which blocks browser
// requests and was failing from servers too (see docs/PLACES_OVERPASS_406_ISSUE.md).
// Geoapify returns each place's raw OSM tags, so the response keeps the same
// shape as before and Places.jsx needs no data-layer changes.
const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";
const GEOAPIFY_TIMEOUT_MS = 6000;
const OSRM_TIMEOUT_MS = 2000;
// Return more than the 5 cards the UI shows: the browser drops places whose
// opening_hours say "closed now". That check runs in the browser because
// functions run in UTC, not the place's timezone.
export const MAX_CANDIDATES = 20;

// Only the tags the Places UI reads, to keep the payload small.
const KEEP_TAGS = new Set([
  "name", "amenity", "shop", "tourism", "leisure", "cuisine",
  "addr:housenumber", "addr:street", "addr:city",
  "opening_hours", "brand:wikidata", "phone", "contact:phone",
  "takeaway", "drive_through", "delivery", "outdoor_seating", "wheelchair", "internet_access",
]);
const OSM_TYPES = { n: "node", w: "way", r: "relation", node: "node", way: "way", relation: "relation" };

function requireKey(env) {
  const key = env.GEOAPIFY_API_KEY;
  if (!key) throw new HttpError(500, "Places service is not configured");
  return key;
}

export function buildGeoapifyUrl(lat, lon, category, key) {
  const qs = new URLSearchParams({
    categories: category.geoapify.join(","),
    filter: `circle:${lon},${lat},${category.radius}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(MAX_CANDIDATES * 2),
    lang: "en",
    apiKey: key,
  });
  return `${GEOAPIFY_URL}?${qs}`;
}

function isDisusedOrAbandoned(tags) {
  return (
    Object.keys(tags).some((k) => k.startsWith("disused:") || k.startsWith("abandoned:")) ||
    Boolean(tags.fixme)
  );
}

/** Geoapify GeoJSON feature → { type, id, lat, lon, tags } using its raw OSM tags. */
export function featureToElement(feature) {
  const p = feature?.properties || {};
  const raw = p.datasource?.raw || {};
  const tags = {
    ...raw,
    name: raw.name ?? p.name,
    opening_hours: raw.opening_hours ?? p.opening_hours,
    "addr:housenumber": raw["addr:housenumber"] ?? p.housenumber,
    "addr:street": raw["addr:street"] ?? p.street,
    "addr:city": raw["addr:city"] ?? p.city,
  };
  return {
    type: OSM_TYPES[raw.osm_type] ?? "place",
    id: raw.osm_id ?? p.place_id,
    lat: p.lat ?? feature?.geometry?.coordinates?.[1],
    lon: p.lon ?? feature?.geometry?.coordinates?.[0],
    tags,
  };
}

/** Elements → named, live places with trimmed tags, nearest first. */
export function selectCandidates(elements, lat, lon) {
  return (elements || [])
    .map((el) => {
      const tags = el.tags || {};
      if (!tags.name || isDisusedOrAbandoned(tags) || el.lat == null || el.lon == null) return null;
      const kept = Object.fromEntries(
        Object.entries(tags).filter(([k, v]) => KEEP_TAGS.has(k) && v != null && v !== "")
      );
      return { type: el.type, id: el.id, lat: el.lat, lon: el.lon, tags: kept, distanceMi: haversineMi(lat, lon, el.lat, el.lon) };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, MAX_CANDIDATES);
}

async function queryGeoapify(url) {
  let resp;
  try {
    resp = await fetchWithTimeout(url, { timeoutMs: GEOAPIFY_TIMEOUT_MS, headers: { Accept: "application/json" } });
  } catch {
    throw new HttpError(504, "Places service timed out. Please try again.", { retryable: true });
  }
  if (resp.status === 401 || resp.status === 403) {
    console.error(`Geoapify rejected the API key (${resp.status})`);
    throw new HttpError(502, "Places service is misconfigured");
  }
  if (resp.status === 429) throw new HttpError(503, "Places service is busy. Please try again.", { retryable: true });
  if (!resp.ok) {
    // 400 usually means an invalid category key; log Geoapify's message (it has no secrets).
    const detail = await resp.text().catch(() => "");
    console.error(`Geoapify HTTP ${resp.status}: ${detail.slice(0, 300)}`);
    throw new HttpError(502, "Places service error. Please try again.", { retryable: true });
  }
  return resp.json();
}

/** Adds etaMinutes (driving) to each place. Best-effort: leaves null on failure. */
async function addEtas(lat, lon, places) {
  if (!places.length) return places;
  const coords = [`${lon},${lat}`, ...places.map((p) => `${p.lon},${p.lat}`)].join(";");
  try {
    const resp = await fetchWithTimeout(
      `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`,
      { timeoutMs: OSRM_TIMEOUT_MS }
    );
    const durations = resp.ok ? (await resp.json()).durations?.[0] : null;
    return places.map((p, i) => {
      const secs = durations?.[i + 1];
      return { ...p, etaMinutes: secs != null && secs > 0 ? Math.round(secs / 60) : null };
    });
  } catch {
    return places.map((p) => ({ ...p, etaMinutes: null }));
  }
}

/** GET /api/places?lat&lon&cat → { places: [{ type, id, lat, lon, tags, distanceMi, etaMinutes }] } */
export async function places(params, env = process.env) {
  const lat = parseCoord(params, "lat", -90, 90, 3);
  const lon = parseCoord(params, "lon", -180, 180, 3);
  const catId = parseEnum(params, "cat", PLACE_CATEGORY_IDS);
  const key = requireKey(env);
  const category = PLACE_CATEGORIES.find((c) => c.id === catId);

  const data = await queryGeoapify(buildGeoapifyUrl(lat, lon, category, key));
  const elements = (data.features || []).map(featureToElement);
  const withEta = await addEtas(lat, lon, selectCandidates(elements, lat, lon));

  return json(
    { places: withEta },
    { cache: { cdn: 600, swr: 1200, browser: 300, vary: ["lat", "lon", "cat"] } }
  );
}
