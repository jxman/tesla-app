import { HttpError, fetchWithTimeout, json, parseCoord } from "./http.mjs";

const OWM_BASE = "https://api.openweathermap.org";

function requireKey(env) {
  const key = env.OPENWEATHER_API_KEY;
  if (!key) throw new HttpError(500, "Weather service is not configured");
  return key;
}

async function owmJson(url) {
  let resp;
  try {
    resp = await fetchWithTimeout(url, { timeoutMs: 6000 });
  } catch {
    throw new HttpError(504, "Weather service timed out", { retryable: true });
  }
  // 422 rather than 404: Netlify treats a function 404 as "no route" and replaces the body.
  if (resp.status === 404) throw new HttpError(422, "Location not found");
  if (resp.status === 401) {
    console.error("OpenWeather rejected the API key (401)");
    throw new HttpError(502, "Weather service is misconfigured");
  }
  if (resp.status === 429) throw new HttpError(503, "Weather service is busy", { retryable: true });
  if (!resp.ok) throw new HttpError(502, `Weather service error (${resp.status})`, { retryable: true });
  return resp.json();
}

/** GET /api/weather?lat&lon → { current, forecast } (raw OpenWeather payloads) */
export async function weather(params, env = process.env) {
  const lat = parseCoord(params, "lat", -90, 90, 2);
  const lon = parseCoord(params, "lon", -180, 180, 2);
  const key = requireKey(env);
  const qs = new URLSearchParams({ lat, lon, units: "metric", appid: key });

  const [current, forecast] = await Promise.all([
    owmJson(`${OWM_BASE}/data/2.5/weather?${qs}`),
    owmJson(`${OWM_BASE}/data/2.5/forecast?${qs}`),
  ]);

  return json(
    { current, forecast },
    { cache: { cdn: 600, swr: 1200, browser: 300, vary: ["lat", "lon"] } }
  );
}

const ZIP_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;
const COUNTRY_RE = /^[A-Za-z]{2}$/;

/** GET /api/geocode?zip=02134[&country=US] → { lat, lon, name, country } */
export async function geocode(params, env = process.env) {
  const zip = (params.get("zip") || "").trim();
  const country = (params.get("country") || "US").trim().toUpperCase();
  if (!ZIP_RE.test(zip)) throw new HttpError(400, "Invalid zip code");
  if (!COUNTRY_RE.test(country)) throw new HttpError(400, "Invalid country code");
  const key = requireKey(env);

  const qs = new URLSearchParams({ zip: `${zip},${country}`, appid: key });
  const geo = await owmJson(`${OWM_BASE}/geo/1.0/zip?${qs}`);

  return json(
    { lat: geo.lat, lon: geo.lon, name: geo.name, country: geo.country },
    { cache: { cdn: 30 * 86400, swr: 86400, browser: 86400, vary: ["zip", "country"] } }
  );
}
