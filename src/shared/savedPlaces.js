// Saved places for the Traffic card (Home, Work, …), kept ONLY in this
// browser's localStorage. They are never stored on the server; coordinates are
// sent to /api/drive-times only when drive times are requested.

const STORAGE_KEY = "tesla.savedPlaces.v1";
// 4 = the Traffic card's 2×2 tile grid (the API accepts up to 5)
export const MAX_SAVED_PLACES = 4;

function isValidPlace(p) {
  return (
    p && typeof p.id === "string" && typeof p.label === "string" &&
    Number.isFinite(p.lat) && Number.isFinite(p.lon)
  );
}

export function loadSavedPlaces() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isValidPlace).slice(0, MAX_SAVED_PLACES) : [];
  } catch {
    return []; // storage blocked or corrupt — start empty
  }
}

export function storeSavedPlaces(places) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places.slice(0, MAX_SAVED_PLACES)));
    return true;
  } catch {
    return false; // private mode / storage full — keep working in memory
  }
}

export function makePlace({ label, address, lat, lon }) {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    label: label.trim().slice(0, 24),
    address: address || null,
    lat,
    lon,
  };
}
