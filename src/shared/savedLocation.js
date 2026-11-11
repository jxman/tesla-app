// Last location the user set (GPS fix or zip code), kept ONLY in this
// browser's localStorage. Used at startup when GPS is unavailable, which is
// common in the Tesla browser, so the app doesn't fall back to Boston every time.

const STORAGE_KEY = "tesla.lastLocation.v1";

export function loadLastLocation() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon) && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180) {
      return { lat: v.lat, lon: v.lon, label: typeof v.label === "string" ? v.label : null };
    }
  } catch {
    /* storage blocked or corrupt */
  }
  return null;
}

export function storeLastLocation({ lat, lon, label }) {
  try {
    // ~11 m precision is plenty for weather, places and traffic
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)), label: label || null })
    );
  } catch {
    /* private mode / storage full: keep working without it */
  }
}
