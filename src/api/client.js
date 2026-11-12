// Browser client for the app's own /api/* Netlify function. API keys and
// third-party calls stay on the server; the browser only talks to its own origin.

export class ApiError extends Error {
  constructor(message, status, retryable = false) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

async function getJson(path, params) {
  let resp;
  try {
    resp = await fetch(`/api/${path}?${new URLSearchParams(params)}`);
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0, true);
  }
  let body = null;
  try {
    body = await resp.json();
  } catch {
    /* non-JSON error page */
  }
  if (!resp.ok) {
    throw new ApiError(body?.error || `Request failed (${resp.status})`, resp.status, body?.retryable ?? false);
  }
  return body;
}

// Coordinates are rounded so nearby users share CDN cache entries
// (2 dp ≈ 1.1 km for weather, 3 dp ≈ 110 m for places). The server rounds too.
const round = (n, dp) => Number(n).toFixed(dp);

export const getWeather = (lat, lon) =>
  getJson("weather", { lat: round(lat, 2), lon: round(lon, 2) });

export const geocodeZip = (zip, country = "US") =>
  getJson("geocode", { zip: zip.trim(), country });

export const getNews = (category) => getJson("news", { category });

export const getPlaces = (lat, lon, cat) =>
  getJson("places", { lat: round(lat, 3), lon: round(lon, 3), cat });

export const getIncidents = (lat, lon) =>
  getJson("incidents", { lat: round(lat, 2), lon: round(lon, 2) });

/** places: [{ lat, lon }] (max 5) → { routes: [...] } in the same order */
export const getDriveTimes = (lat, lon, places) =>
  getJson("drive-times", {
    lat: round(lat, 3),
    lon: round(lon, 3),
    to: places.map((p) => `${round(p.lat, 4)},${round(p.lon, 4)}`).join(";"),
  });

/** US towns for the Change location box: [{ label: "Medfield, MA", detail, lat, lon }] */
export const searchTowns = (text, lat, lon) =>
  getJson("search", lat != null && lon != null
    ? { text, type: "city", lat: round(lat, 1), lon: round(lon, 1) }
    : { text, type: "city" });

export const searchAddress = (text, lat, lon) =>
  getJson("search", lat != null && lon != null
    ? { text, lat: round(lat, 1), lon: round(lon, 1) }
    : { text });
