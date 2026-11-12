import { lazy, Suspense, useEffect, useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";
import { getTown } from "../api/client";
import DetailSheet, { Stat, Block, C } from "./DetailSheet";

// Set to false to drop the map (and the lazily loaded Leaflet chunk) from the
// incident details sheet.
const SHOW_INCIDENT_MAP = true;
const IncidentMap = SHOW_INCIDENT_MAP ? lazy(() => import("./IncidentMap")) : null;

// color: theme token for text; line: map line colour (readable on light and dark tiles)
const SEVERITY = {
  major: { label: "Major delay", color: "--closed-fg", line: "#dc2626" },
  undefined: { label: "Severity unknown", color: "--closed-fg", line: "#dc2626" }, // TomTom uses this for closures
  moderate: { label: "Moderate delay", color: "--warn-fg", line: "#f59e0b" },
  minor: { label: "Minor delay", color: "--mute", line: "#6b7280" },
  unknown: { label: null, color: "--mute", line: "#6b7280" },
};

/** "9:50 AM", "Tue 4:50 PM" or "Nov 3" depending on how far from now. */
export function formatWhen(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.abs(d - now) / 86400000;
  if (d.toDateString() === now.toDateString()) return time;
  if (days < 6) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Share of the start → expected-clear window that has passed, for the progress bar. */
export function clearProgress(startIso, endIso, now = Date.now()) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const left = Math.round((end - now) / 60000);
  const label = left > 90 ? `About ${Math.round(left / 60)} h left`
    : left > 0 ? `About ${left} min left`
    : "Should be clearing now";
  return { pct, label };
}

/**
 * Details for a "Traffic near me" incident: what, where, how bad, since when,
 * plus a small map of the affected stretch (IncidentMap).
 */
export default function IncidentSheet({ incident, icon: Icon, from, onClose }) {
  const { isDark } = useTheme();
  // TomTom gives only cross streets; look up the town (OpenWeather reverse
  // geocoding via /api/town, cached) so "Main Street → Holliston Street" has context
  const [town, setTown] = useState(null);
  useEffect(() => {
    if (!Number.isFinite(incident?.lat) || !Number.isFinite(incident?.lon)) return undefined;
    let cancelled = false;
    setTown(null);
    getTown(incident.lat, incident.lon)
      .then((t) => { if (!cancelled) setTown(t); })
      .catch(() => {}); // optional: the streets still show
    return () => { cancelled = true; };
  }, [incident?.lat, incident?.lon]);

  if (!incident) return null;
  const sev = SEVERITY[incident.magnitude] || SEVERITY.unknown;
  const route = incident.from && incident.to ? `${incident.from} → ${incident.to}` : incident.from;
  const since = formatWhen(incident.startTime);
  const until = formatWhen(incident.endTime);
  const clearing = clearProgress(incident.startTime, incident.endTime);
  const confidence = [
    incident.reports ? `${incident.reports} report${incident.reports === 1 ? "" : "s"}` : null,
    incident.lastReportTime ? `last ${formatWhen(incident.lastReportTime)}` : null,
    incident.probability && incident.probability !== "certain" ? `${incident.probability}` : null,
  ].filter(Boolean).join(" · ");
  const showMap = SHOW_INCIDENT_MAP && incident.path?.length > 0;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lon}`;

  return (
    <DetailSheet
      title={incident.title}
      subtitle={sev.label}
      subtitleColor={`var(${sev.color})`}
      icon={Icon}
      iconColor={`var(${sev.color})`}
      maxWidth={showMap ? 760 : 560}
      onClose={onClose}
      secondary={{ label: "Show in Google Maps", icon: FiExternalLink, onClick: () => window.open(mapsUrl, "_blank", "noopener,noreferrer") }}
    >
      <div className={`grid gap-4 ${showMap ? "sm:grid-cols-[1fr_300px]" : ""}`}>
        <div className="flex flex-col gap-3 min-w-0 justify-between">
          {/* At-a-glance numbers */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Delay" value={incident.delayMin ? `+${incident.delayMin}` : "—"} unit={incident.delayMin ? "min" : null} color={incident.delayMin ? `var(${sev.color})` : null} />
            <Stat label="Length" value={incident.lengthMi ?? "—"} unit={incident.lengthMi != null ? "mi" : null} />
            <Stat label="Away" value={incident.distanceMi} unit="mi" />
          </div>

          {(incident.road || route || town) && (
            <Block label="Where">
              {(incident.road || town) && (
                <div className="font-semibold">{[incident.road, town].filter(Boolean).join(" · ")}</div>
              )}
              {route && <div className="line-clamp-2">{route}</div>}
            </Block>
          )}

          {(since || until) && (
            <Block label="When">
              <div className="flex justify-between gap-3">
                <span>{since ? `Started ${since}` : "Start time unknown"}</span>
                {until && <span className="text-right">Clears ~{until}</span>}
              </div>
              {clearing && (
                <>
                  <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: C.line }}>
                    <div className="h-full rounded-full" style={{ width: `${clearing.pct}%`, background: `var(${sev.color})` }} />
                  </div>
                  <div className="mt-1" style={{ color: C.mute, fontSize: "0.85em" }}>{clearing.label}</div>
                </>
              )}
            </Block>
          )}

          {(incident.details?.length > 0 || confidence) && (
            <div style={{ color: C.mute, fontSize: "clamp(12px, 1.7vw, 14px)" }}>
              {[incident.details?.join(" · "), confidence].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {showMap && (
          <div style={{ height: "clamp(200px, 42vh, 300px)" }}>
            <Suspense fallback={<div className="w-full h-full rounded-xl animate-pulse" style={{ background: C.deep }} />}>
              <IncidentMap path={incident.path} user={from} color={sev.line} dark={isDark} />
            </Suspense>
          </div>
        )}
      </div>
    </DetailSheet>
  );
}
