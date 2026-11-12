import { lazy, Suspense, useEffect } from "react";
import { FiX, FiExternalLink } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

// Set to false to drop the map (and the lazily loaded Leaflet chunk) from the
// incident details sheet.
const SHOW_INCIDENT_MAP = true;
const IncidentMap = SHOW_INCIDENT_MAP ? lazy(() => import("./IncidentMap")) : null;

const C = {
  card: "var(--card)",
  deep: "var(--surface-deep)",
  line: "var(--line)",
  text: "var(--text)",
  mute: "var(--mute)",
};

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

const LABEL_STYLE = { color: C.mute, fontSize: 12, letterSpacing: "0.06em" };

function Stat({ label, value, unit, color }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: C.deep, border: `1px solid ${C.line}` }}>
      <div className="font-mono uppercase" style={LABEL_STYLE}>{label}</div>
      <div className="leading-tight mt-0.5 whitespace-nowrap">
        <span className="font-semibold tabular-nums" style={{ color: color || C.text, fontSize: "clamp(20px, 3.2vw, 28px)" }}>{value}</span>
        {unit && <span style={{ color: C.mute, fontSize: "clamp(12px, 1.7vw, 15px)" }}> {unit}</span>}
      </div>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: C.deep, border: `1px solid ${C.line}` }}>
      <div className="font-mono uppercase mb-1" style={LABEL_STYLE}>{label}</div>
      <div style={{ color: C.text, fontSize: "clamp(14px, 2vw, 17px)", lineHeight: 1.35 }}>{children}</div>
    </div>
  );
}

/**
 * Details for a "Traffic near me" incident: what, where, how bad, since when,
 * plus a small map of the affected stretch (IncidentMap).
 */
export default function IncidentSheet({ incident, icon: Icon, from, onClose }) {
  const { isDark } = useTheme();
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={incident.title}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: showMap ? 760 : 560, maxHeight: "calc(100vh - 32px)", background: C.card, border: `1px solid ${C.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          {Icon && <Icon className="w-7 h-7 flex-shrink-0 mt-0.5" style={{ color: `var(${sev.color})` }} />}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate" style={{ color: C.text, fontSize: "clamp(20px, 3vw, 26px)", lineHeight: 1.2 }}>{incident.title}</h2>
            {sev.label && <div style={{ color: `var(${sev.color})`, fontSize: "clamp(13px, 1.9vw, 16px)" }}>{sev.label}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{ color: C.text, background: C.deep, border: `1px solid ${C.line}` }}
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className={`min-h-0 overflow-y-auto px-5 pb-2 grid gap-4 ${showMap ? "sm:grid-cols-[1fr_300px]" : ""}`}>
          <div className="flex flex-col gap-3 min-w-0 justify-between">
            {/* At-a-glance numbers */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Delay" value={incident.delayMin ? `+${incident.delayMin}` : "—"} unit={incident.delayMin ? "min" : null} color={incident.delayMin ? `var(${sev.color})` : null} />
              <Stat label="Length" value={incident.lengthMi ?? "—"} unit={incident.lengthMi != null ? "mi" : null} />
              <Stat label="Away" value={incident.distanceMi} unit="mi" />
            </div>

            {(incident.road || route) && (
              <Block label="Where">
                {incident.road && <div className="font-semibold">{incident.road}</div>}
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

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
            className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-medium"
            style={{ color: C.text, background: C.deep, border: `1px solid ${C.line}`, fontSize: 16 }}
          >
            <FiExternalLink className="w-5 h-5" /> Show in Google Maps
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-xl font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            style={{ fontSize: 16 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
