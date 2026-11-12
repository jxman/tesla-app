import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Small map for the incident details sheet. Loaded lazily (React.lazy in
// IncidentSheet), so Leaflet is only downloaded when a sheet is opened.
// Tiles: OpenStreetMap's standard tiles (no key; fine for light personal use
// under the OSM tile policy, with attribution). Dark mode inverts the tiles
// with a CSS filter (.incident-map-dark in index.css). CARTO's free basemaps
// now require an API key.

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const NEARBY_MI = 5; // also fit the user's position in view when this close

function milesBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * path:  [[lat, lon], …] — the affected stretch of road
 * user:  { lat, lon } — the app's current location
 * color: line colour (hex; drawn over an outline so it shows on any road colour)
 * dark:  theme, for the tile style
 */
export default function IncidentMap({ path, user, color, dark }) {
  const el = useRef(null);

  // Rebuilt when the theme changes so the line colour follows it
  useEffect(() => {
    if (!el.current || !path?.length) return undefined;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    const casing = dark ? "#0b0d10" : "#ffffff";

    let line;
    if (path.length > 1) {
      L.polyline(path, { color: casing, weight: 11, opacity: 0.9, lineCap: "round" }).addTo(m);
      line = L.polyline(path, { color, weight: 6, opacity: 1, lineCap: "round" }).addTo(m);
    } else {
      line = L.circleMarker(path[0], { radius: 10, color: casing, weight: 3, fillColor: color, fillOpacity: 0.9 }).addTo(m);
    }

    let bounds = path.length > 1 ? line.getBounds() : L.latLngBounds([path[0], path[0]]);
    if (Number.isFinite(user?.lat) && Number.isFinite(user?.lon)) {
      const me = [user.lat, user.lon];
      L.circleMarker(me, { radius: 7, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 })
        .bindTooltip("You", { direction: "top", offset: [0, -6] })
        .addTo(m);
      if (milesBetween(me, path[0]) <= NEARBY_MI) bounds = bounds.extend(me);
    }
    m.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });

    return () => m.remove();
  }, [path, user?.lat, user?.lon, color, dark]);

  return (
    <div
      ref={el}
      className={`w-full h-full rounded-xl overflow-hidden ${dark ? "incident-map-dark" : ""}`}
      style={{ background: "var(--surface-deep)" }}
    />
  );
}
