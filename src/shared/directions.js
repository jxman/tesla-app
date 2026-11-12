// What tapping a Places card or a drive-time tile does:
//   "details"    — open the in-app details sheet (voice command, address,
//                  phone, hours) with a Google Maps directions button
//   "directions" — open Google Maps directions straight away (previous behaviour)
export const PLACE_TAP_ACTION = "details";

// Google Maps directions link from the app's current location to a place.
// The origin is passed explicitly because the Tesla browser often can't share
// GPS with Google Maps, which would otherwise ask for a starting point.
// (The browser can't hand a destination to the car's own navigation.)
const coord = (n) => Number(n.toFixed(5)); // ~1 m; GPS gives 14+ decimals

export function directionsUrl(from, to) {
  const params = new URLSearchParams({ api: "1", destination: `${coord(to.lat)},${coord(to.lon)}`, travelmode: "driving" });
  if (Number.isFinite(from?.lat) && Number.isFinite(from?.lon)) params.set("origin", `${coord(from.lat)},${coord(from.lon)}`);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function openDirections(from, to) {
  window.open(directionsUrl(from, to), "_blank", "noopener,noreferrer");
}
