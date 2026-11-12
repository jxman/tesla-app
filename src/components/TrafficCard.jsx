import { useState, useEffect, useCallback, useRef } from "react";
import {
  FiPlus, FiRefreshCw, FiX, FiEdit2, FiCheck, FiSearch, FiAlertTriangle, FiAlertOctagon,
  FiAlertCircle, FiSlash, FiTool, FiMinusCircle, FiCloudRain, FiTruck, FiActivity, FiHome,
  FiBriefcase, FiMapPin, FiZap, FiChevronRight,
} from "react-icons/fi";
import { getDriveTimes, getIncidents, getPlaces, searchAddress } from "../api/client";
import { chargingInfo, chargingSummary } from "../shared/charging";
import { loadSavedPlaces, storeSavedPlaces, makePlace, MAX_SAVED_PLACES } from "../shared/savedPlaces";

// Design tokens (values live in src/index.css and switch with .dark)
const C = {
  card: "var(--card)",
  deep: "var(--surface-deep)",
  line: "var(--line)",
  text: "var(--text)",
  mute: "var(--mute)",
  dim: "var(--dim)",
  ok: "var(--open-fg)",
  warn: "var(--warn-fg)",
  bad: "var(--closed-fg)",
};

const REFRESH_MS = 3 * 60 * 1000; // matches the 2-min CDN cache + margin
const QUICK_LABELS = ["Home", "Work", "Gym"];

/**
 * Nearest charger worth driving to: Tesla plugs first, then CCS (adapter).
 * Uses /api/places, the same CDN-cached data as the Places tab's Charging list.
 */
function useNearestCharger(lat, lon) {
  const [charger, setCharger] = useState(null);
  // Round so small GPS jitter doesn't refetch (3 dp ≈ 110 m, same as the API)
  const rLat = lat == null ? null : Number(lat.toFixed(3));
  const rLon = lon == null ? null : Number(lon.toFixed(3));

  useEffect(() => {
    if (rLat == null || rLon == null) return undefined;
    let cancelled = false;
    getPlaces(rLat, rLon, "charging")
      .then(({ places = [] }) => {
        const best = places
          .map((p) => ({ p, info: chargingInfo(p.tags || {}) }))
          .filter(({ info }) => info && info.rank <= 1)
          .sort((a, b) => a.info.rank - b.info.rank || a.p.distanceMi - b.p.distanceMi)[0];
        if (!cancelled) {
          setCharger(best ? {
            name: best.p.tags.name,
            summary: chargingSummary(best.info),
            tesla: best.info.rank === 0,
            distanceMi: best.p.distanceMi,
            etaMinutes: best.p.etaMinutes ?? null,
            lat: best.p.lat,
            lon: best.p.lon,
          } : null);
        }
      })
      .catch(() => { if (!cancelled) setCharger(null); }); // optional extra; hide on failure
    return () => { cancelled = true; };
  }, [rLat, rLon]);

  return charger;
}

function NearestCharger({ charger }) {
  if (!charger) return null;
  const meta = [
    charger.distanceMi != null ? `${charger.distanceMi.toFixed(1)} mi` : null,
    charger.etaMinutes != null ? `${charger.etaMinutes} min` : null,
    charger.summary,
  ].filter(Boolean).join(" · ");
  return (
    <button
      onClick={() => window.open(`https://maps.google.com/?q=${charger.lat},${charger.lon}`, "_blank", "noopener,noreferrer")}
      className="flex items-center gap-3 px-4 rounded-xl text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors flex-shrink-0"
      style={{ minHeight: 64, border: `1px solid ${C.line}` }}
      aria-label={`Directions to ${charger.name}`}
    >
      <FiZap className="w-5 h-5 flex-shrink-0" style={{ color: C.ok }} />
      <div className="flex-1 min-w-0">
        <div style={{ color: C.mute, fontSize: "clamp(11px, 1.4vw, 12px)", letterSpacing: "0.04em" }}>
          {charger.tesla ? "NEAREST TESLA CHARGER" : "NEAREST FAST CHARGER"}
        </div>
        <div className="font-semibold truncate" style={{ color: C.text, fontSize: "clamp(14px, 1.8vw, 17px)" }}>{charger.name}</div>
        <div className="truncate" style={{ color: C.mute, fontSize: "clamp(11px, 1.45vw, 13px)" }}>{meta}</div>
      </div>
      <FiChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: C.dim }} />
    </button>
  );
}

const INCIDENT_ICONS = {
  accident: FiAlertTriangle,
  jam: FiActivity,
  roadClosed: FiSlash,
  roadWorks: FiTool,
  laneClosed: FiMinusCircle,
  brokenDownVehicle: FiTruck,
  dangerousConditions: FiAlertOctagon,
  fog: FiCloudRain, rain: FiCloudRain, ice: FiCloudRain, wind: FiCloudRain, flooding: FiCloudRain,
};

function placeIcon(label) {
  const l = label.toLowerCase();
  if (l === "home") return FiHome;
  if (l === "work" || l === "office") return FiBriefcase;
  return FiMapPin;
}

function delayStyle(delayMin) {
  if (delayMin == null) return null;
  if (delayMin >= 10) return { color: C.bad, text: `+${delayMin} min` };
  if (delayMin >= 2) return { color: C.warn, text: `+${delayMin} min` };
  return { color: C.ok, text: "No delay" };
}

function severityColor(magnitude) {
  if (magnitude === "major" || magnitude === "undefined") return C.bad;
  if (magnitude === "moderate") return C.warn;
  return C.mute;
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between" style={{ minHeight: 44 }}>
      <span className="font-mono uppercase tracking-wider" style={{ fontSize: "clamp(11px, 1.4vw, 13px)", color: C.mute }}>
        {children}
      </span>
      <div className="flex items-center gap-1.5">{right}</div>
    </div>
  );
}

function IconButton({ onClick, label, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-11 h-11 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700/50"
      style={{ border: `1px solid ${C.line}`, color: C.text }}
    >
      {children}
    </button>
  );
}

// ─── Add-place form ───────────────────────────────────────────────────────────
function AddPlaceForm({ lat, lon, existingLabels, onAdd, onCancel }) {
  const [label, setLabel] = useState(QUICK_LABELS.find((l) => !existingLabels.includes(l)) || "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const latestQuery = useRef(0);

  // Debounced autocomplete (min 3 chars) to keep API usage low
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) { setResults([]); setError(null); return undefined; }
    const id = ++latestQuery.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { results: found = [] } = await searchAddress(text, lat, lon);
        if (id === latestQuery.current) { setResults(found); setError(found.length ? null : "No matches"); }
      } catch (err) {
        if (id === latestQuery.current) { setResults([]); setError(err.message); }
      } finally {
        if (id === latestQuery.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, lat, lon]);

  const choose = (r) => {
    const name = label.trim() || r.label;
    onAdd(makePlace({ label: name, address: [r.label, r.detail].filter(Boolean).join(", "), lat: r.lat, lon: r.lon }));
  };

  const inputClass =
    "h-11 px-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/60";
  const inputStyle = { border: `1px solid ${C.line}`, color: C.text, background: C.deep, fontSize: 16 };

  // Pinned to the top of the screen: the Tesla on-screen keyboard covers the
  // bottom ~45% of the browser and doesn't resize the page, so everything you
  // type into (and the first results) must sit in the top half.
  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-label="Add a place">
      <div
        className="mx-auto w-full max-w-5xl flex flex-col gap-2 p-3 rounded-b-2xl shadow-2xl"
        style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}
      >
        <div className="flex items-center gap-1.5">
          {QUICK_LABELS.map((l) => (
            <button
              key={l}
              onClick={() => setLabel(l)}
              className={`h-11 px-3 rounded-xl font-medium transition-colors flex-shrink-0 ${
                label === l
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
              }`}
              style={{ fontSize: 15 }}
            >
              {l}
            </button>
          ))}
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name (e.g. School)"
            maxLength={24}
            aria-label="Place name"
            className={`${inputClass} flex-1 min-w-0`}
            style={inputStyle}
          />
          <IconButton onClick={onCancel} label="Cancel"><FiX className="w-5 h-5" /></IconButton>
        </div>

        <div className="relative">
          <FiSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.mute }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address or place"
            aria-label="Search address or place"
            autoFocus
            className={`${inputClass} w-full pl-9`}
            style={inputStyle}
          />
          {searching && (
            <FiRefreshCw className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: C.mute }} />
          )}
        </div>

        {(error || results.length > 0) && (
          // Capped so the list ends above the keyboard (~53% of the screen
          // height stays visible); scroll for more
          <div className="overflow-y-auto flex flex-col gap-1" style={{ maxHeight: "max(110px, calc(52vh - 125px))" }}>
            {error && <p style={{ color: C.mute, fontSize: 14 }} className="px-1 py-2">{error}</p>}
            {results.map((r, i) => (
              <button
                key={`${r.lat},${r.lon},${i}`}
                onClick={() => choose(r)}
                className="text-left px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors flex-shrink-0"
                style={{ minHeight: 48, border: `1px solid ${C.line}` }}
              >
                <div className="font-medium truncate" style={{ color: C.text, fontSize: 15 }}>{r.label}</div>
                {r.detail && <div className="truncate" style={{ color: C.mute, fontSize: 12 }}>{r.detail}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Tap outside the panel to cancel */}
      <button className="flex-1 bg-black/50" onClick={onCancel} aria-label="Cancel" tabIndex={-1} />
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export default function TrafficCard({ lat, lon }) {
  const [saved, setSaved] = useState(loadSavedPlaces);
  const [routes, setRoutes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routesError, setRoutesError] = useState(null);
  const [incidentsError, setIncidentsError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [mode, setMode] = useState("view"); // view | edit | add
  const latestRequest = useRef(0);
  const nearestCharger = useNearestCharger(lat, lon);

  const refresh = useCallback(async () => {
    if (lat == null || lon == null) return;
    const id = ++latestRequest.current;
    setLoading(true);
    const [incRes, routeRes] = await Promise.allSettled([
      getIncidents(lat, lon),
      saved.length ? getDriveTimes(lat, lon, saved) : Promise.resolve({ routes: [] }),
    ]);
    if (id !== latestRequest.current) return; // a newer refresh superseded this one

    setIncidents(incRes.status === "fulfilled" ? incRes.value.incidents || [] : []);
    setRoutes(routeRes.status === "fulfilled" ? routeRes.value.routes || [] : []);
    setIncidentsError(incRes.status === "rejected" ? incRes.reason?.message || "Incidents unavailable" : null);
    setRoutesError(routeRes.status === "rejected" ? routeRes.reason?.message || "Drive times unavailable" : null);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [lat, lon, saved]);

  // Refresh now and every REFRESH_MS, but only while the page is visible: a
  // hidden tab or a sleeping screen makes no TomTom calls. On return, refresh
  // straight away if the data has gone stale.
  const lastRefresh = useRef(0);
  useEffect(() => {
    const run = () => {
      lastRefresh.current = Date.now();
      refresh();
    };
    const isVisible = () => document.visibilityState !== "hidden";
    run();
    const timer = setInterval(() => { if (isVisible()) run(); }, REFRESH_MS);
    const onVisible = () => {
      if (isVisible() && Date.now() - lastRefresh.current >= REFRESH_MS) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const updateSaved = (next) => {
    setSaved(next);
    setRoutes([]); // old results no longer line up with the list
    storeSavedPlaces(next);
  };

  const addPlace = (place) => {
    updateSaved([...saved, place].slice(0, MAX_SAVED_PLACES));
    setMode("view");
  };
  const removePlace = (id) => updateSaved(saved.filter((p) => p.id !== id));

  const editing = mode === "edit";
  const now = new Date();
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // ── Left column: drive times (or the add-place form) ──
  const driveTimesColumn = (
    <>
      {mode === "add" && (
        <AddPlaceForm
          lat={lat}
          lon={lon}
          existingLabels={saved.map((p) => p.label)}
          onAdd={addPlace}
          onCancel={() => setMode(saved.length ? "edit" : "view")}
        />
      )}
      <SectionTitle
        right={
          <>
            {saved.length > 0 && (
              <IconButton onClick={() => setMode(editing ? "view" : "edit")} label={editing ? "Done" : "Edit places"}>
                {editing ? <FiCheck className="w-5 h-5" /> : <FiEdit2 className="w-4 h-4" />}
              </IconButton>
            )}
            {saved.length < MAX_SAVED_PLACES && (
              <IconButton onClick={() => setMode("add")} label="Add place"><FiPlus className="w-5 h-5" /></IconButton>
            )}
          </>
        }
      >
        Drive times
      </SectionTitle>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
        {saved.length === 0 && (
          <button
            onClick={() => setMode("add")}
            className="flex-1 flex flex-col items-center justify-center gap-2 px-4 rounded-xl text-center hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors"
            style={{ minHeight: 120, border: `1px dashed ${C.line}`, color: C.mute }}
          >
            <FiPlus className="w-7 h-7" />
            <span style={{ fontSize: "clamp(13px, 1.7vw, 17px)" }}>Add Home or Work to see live drive times</span>
          </button>
        )}

        {saved.map((p, i) => {
          const r = routes[i];
          const Icon = placeIcon(p.label);
          const ok = r && !r.error && !r.here;
          const delay = ok ? delayStyle(r.delayMin) : null;
          const arrive = ok ? fmtTime(new Date(now.getTime() + r.minutes * 60000)) : null;
          const failed = r?.error || (!r && routesError);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 rounded-xl"
              style={{ minHeight: 76, background: C.deep, border: `1px solid ${C.line}` }}
            >
              <Icon className="w-6 h-6 flex-shrink-0" style={{ color: C.mute }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ color: C.text, fontSize: "clamp(15px, 2vw, 19px)" }}>{p.label}</div>
                <div className="truncate" style={{ color: failed ? C.warn : C.mute, fontSize: "clamp(11px, 1.5vw, 14px)" }}>
                  {r?.error ? r.error
                    : !r && routesError ? routesError
                    : r?.here ? "You're here"
                    : ok ? (
                      <>
                        <span style={{ color: delay?.color }}>{delay?.text}</span>
                        {r.miles != null && ` · ${r.miles} mi`}
                      </>
                    )
                    : loading ? "Updating…" : "—"}
                </div>
              </div>
              {editing ? (
                <button
                  onClick={() => removePlace(p.id)}
                  aria-label={`Remove ${p.label}`}
                  className="w-11 h-11 flex items-center justify-center rounded-xl"
                  style={{ color: C.bad, border: `1px solid ${C.line}` }}
                >
                  <FiX className="w-5 h-5" />
                </button>
              ) : ok && (
                <div className="text-right flex-shrink-0 leading-none">
                  <span className="font-light tabular-nums" style={{ color: C.text, fontSize: "clamp(28px, 4.2vw, 44px)" }}>{r.minutes}</span>
                  <span style={{ color: C.mute, fontSize: "clamp(12px, 1.5vw, 15px)" }}> min</span>
                  {arrive && (
                    <div className="mt-1" style={{ color: C.mute, fontSize: "clamp(11px, 1.4vw, 13px)" }}>arrive {arrive}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {nearestCharger && (
        <div className="pt-2 flex-shrink-0">
          <NearestCharger charger={nearestCharger} />
        </div>
      )}
    </>
  );

  // ── Right column: traffic near me ──
  const incidentsColumn = (
    <>
      <SectionTitle
        right={
          <IconButton onClick={refresh} label="Refresh" disabled={loading}>
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </IconButton>
        }
      >
        Traffic near me{incidents.length ? ` · ${incidents.length}` : ""}
      </SectionTitle>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
        {incidents.length === 0 && !loading && !incidentsError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl" style={{ minHeight: 120, border: `1px solid ${C.line}` }}>
            <FiCheck className="w-7 h-7" style={{ color: C.ok }} />
            <span style={{ color: C.mute, fontSize: "clamp(13px, 1.7vw, 16px)" }}>No incidents within 10 miles</span>
          </div>
        )}
        {incidents.map((inc, i) => {
          const Icon = INCIDENT_ICONS[inc.category] || FiAlertCircle;
          const where = [inc.road, inc.from && inc.to ? `${inc.from} → ${inc.to}` : inc.from].filter(Boolean).join(" · ");
          return (
            <div key={inc.id || i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ border: `1px solid ${C.line}` }}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: severityColor(inc.magnitude) }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ color: C.text, fontSize: "clamp(13px, 1.7vw, 16px)" }}>{inc.title}</div>
                {where && (
                  <div className="line-clamp-2" style={{ color: C.mute, fontSize: "clamp(11px, 1.45vw, 13px)" }}>{where}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0 font-mono" style={{ fontSize: "clamp(11px, 1.45vw, 13px)" }}>
                {inc.delayMin ? <div style={{ color: severityColor(inc.magnitude) }}>+{inc.delayMin} min</div> : null}
                <div style={{ color: C.mute }}>{inc.distanceMi} mi</div>
              </div>
            </div>
          );
        })}
        {incidentsError && (
          <p className="px-1 flex items-center gap-2" style={{ color: C.warn, fontSize: 13 }}>
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> {incidentsError}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <section className="flex flex-col min-h-0">{driveTimesColumn}</section>
        <section className="flex flex-col min-h-0">{incidentsColumn}</section>
      </div>
      <div className="flex justify-between pt-2 flex-shrink-0" style={{ color: C.dim, fontSize: 11 }}>
        <span>{updatedAt ? `Updated ${fmtTime(updatedAt)} · refreshes every 3 min` : ""}</span>
        <span>Traffic © TomTom</span>
      </div>
    </div>
  );
}
