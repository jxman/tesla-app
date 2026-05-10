import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import opening_hours from "opening_hours";
import {
  FiNavigation, FiRefreshCw, FiAlertCircle,
  FiCoffee, FiZap, FiHome, FiShoppingBag, FiStar, FiTool,
} from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ink:         "#0e1014",
  card:        "#14181f",
  line:        "#232932",
  text:        "#e8eaed",
  mute:        "#8a93a0",
  dim:         "#5e6772",
  arrowBlue:   "#6db4ff",
  pillBg:      "rgba(20,24,31,0.85)",
  pillLine:    "rgba(255,255,255,0.1)",
  openBg:      "rgba(34,197,94,0.18)",
  openFg:      "#6dd49a",
  openLine:    "rgba(34,197,94,0.35)",
  closedBg:    "rgba(239,68,68,0.18)",
  closedFg:    "#fda4a4",
  closedLine:  "rgba(239,68,68,0.4)",
  chipBg:      "rgba(77,124,255,0.12)",
  chipFg:      "#93b4ff",
  chipLine:    "rgba(77,124,255,0.25)",
  warnBg:      "rgba(245,158,11,0.15)",
  warnFg:      "#fbbf24",
  warnLine:    "rgba(245,158,11,0.3)",
};

// 8-color hash palette for brand panels (no Wikidata logo)
const BRAND_PALETTE = [
  "#1e3a5f", "#3a1e5f", "#1e4d3a", "#5f3a1e",
  "#4a1e3a", "#1e4a5f", "#4a3a1e", "#2a1e5f",
];

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "restaurants", label: "Food", Icon: FiCoffee, radius: 2000,
    filters: [{ key: "amenity", rx: "restaurant|fast_food|cafe|bar|pub|food_court|ice_cream" }],
  },
  {
    id: "charging", label: "Charging", Icon: FiZap, radius: 16000,
    filters: [{ key: "amenity", rx: "charging_station" }],
  },
  {
    id: "lodging", label: "Hotels", Icon: FiHome, radius: 8000,
    filters: [
      { key: "amenity", rx: "hotel|motel" },
      { key: "tourism", rx: "hotel|motel|hostel|guest_house" },
    ],
  },
  {
    id: "shopping", label: "Shopping", Icon: FiShoppingBag, radius: 4000,
    filters: [{ key: "shop", rx: "supermarket|convenience|department_store|mall|clothes|electronics" }],
  },
  {
    id: "fun", label: "Fun", Icon: FiStar, radius: 5000,
    filters: [
      { key: "amenity", rx: "cinema|theatre|arts_centre|nightclub|bowling_alley" },
      { key: "leisure", rx: "park|fitness_centre|swimming_pool|golf_course" },
      { key: "tourism", rx: "attraction|museum|gallery|theme_park|zoo|aquarium" },
    ],
  },
  {
    id: "services", label: "Services", Icon: FiTool, radius: 4000,
    filters: [{ key: "amenity", rx: "bank|atm|pharmacy|hospital|car_repair|post_office|dentist|doctors|police" }],
  },
];

// Attribute chips: tag → label, rendered only for yes/designated (warn for limited)
const CHIP_DEFS = [
  { tag: "takeaway",        label: "Takeaway"   },
  { tag: "drive_through",   label: "Drive-thru" },
  { tag: "delivery",        label: "Delivery"   },
  { tag: "outdoor_seating", label: "Outdoor"    },
  { tag: "wheelchair",      label: "Accessible" },
  { tag: "internet_access", label: "WiFi"       },
];

// ─── Module-level caches ──────────────────────────────────────────────────────
const queryCache = new Map(); // cacheKey → { data: Place[], expires: number }
const inflight   = new Map(); // cacheKey → Promise<Place[]>
const brandCache = new Map(); // qid      → { logoUrl: string|null, expires: number }

// ─── Pure utilities ───────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hashBrand(name) {
  let h = 0;
  for (const ch of name) h = ((h * 31) + ch.charCodeAt(0)) | 0;
  return BRAND_PALETTE[Math.abs(h) % BRAND_PALETTE.length];
}

function makeMonogram(name) {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function humanizeType(tags) {
  const raw = tags.amenity || tags.shop || tags.tourism || tags.leisure || "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAddress(tags) {
  const parts = [];
  if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  if (tags["addr:street"])      parts.push(tags["addr:street"]);
  if (tags["addr:city"])        parts.push(tags["addr:city"]);
  return parts.length ? parts.join(" ") : null;
}

function fmt12h(date) {
  if (!date) return null;
  const h = date.getHours(), m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseOpeningHours(ohStr) {
  if (!ohStr) return null;
  try {
    const oh = new opening_hours(ohStr, null, { mode: 0, warnings_severity: 0 });
    const now   = new Date();
    const isOpen = oh.getState(now);
    const next   = oh.getNextChange(now);
    const t = fmt12h(next);
    return {
      openNow: isOpen,
      label: isOpen
        ? (t ? `til ${t}` : "24h")
        : (t ? `opens ${t}` : null),
    };
  } catch {
    return null;
  }
}

function extractChips(tags) {
  return CHIP_DEFS.flatMap(({ tag, label }) => {
    const val = tags[tag];
    if (!val || val === "no") return [];
    return [{ label, warn: val === "limited" }];
  });
}

function isDisusedOrAbandoned(tags) {
  return (
    Object.keys(tags).some((k) => k.startsWith("disused:") || k.startsWith("abandoned:")) ||
    Boolean(tags.fixme)
  );
}

// ─── Place normalizer ─────────────────────────────────────────────────────────
function normalizePlace(el, userLat, userLon) {
  const tags = el.tags || {};
  if (!tags.name || isDisusedOrAbandoned(tags)) return null;

  const lat = el.type === "node" ? el.lat : el.center?.lat;
  const lon = el.type === "node" ? el.lon : el.center?.lon;
  if (!lat || !lon) return null;

  const hours      = parseOpeningHours(tags.opening_hours);
  const distanceMi = haversine(userLat, userLon, lat, lon);
  const cuisine    = tags.cuisine
    ? tags.cuisine.split(/[;|]/)[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return {
    id:           `${el.type}_${el.id}`,
    name:         tags.name,
    primaryType:  humanizeType(tags),
    cuisine,
    address:      formatAddress(tags),
    lat, lon,
    distanceMi,
    etaMinutes:   null,
    openNow:      hours ? hours.openNow : null,
    hoursLabel:   hours ? hours.label   : null,
    chips:        extractChips(tags),
    brandQid:     tags["brand:wikidata"] || null,
    brandColor:   hashBrand(tags.name),
    brandLogoUrl: null,
    monogram:     makeMonogram(tags.name),
    phone:        tags.phone || tags["contact:phone"] || null,
  };
}

// ─── Overpass fetcher ─────────────────────────────────────────────────────────
const OVERPASS_URL  = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS  = 10 * 60 * 1000; // 10 min
const MAX_RESULTS   = 5;               // 1 featured + 4 regular

function buildOverpassQuery(lat, lon, filters, radius) {
  const stmts = filters
    .map(({ key, rx }) => `nwr["${key}"~"${rx}"](around:${radius},${lat},${lon});`)
    .join("\n  ");
  return `[out:json][timeout:15][maxsize:5000000];\n(\n  ${stmts}\n);\nout body center qt ${MAX_RESULTS * 8};`;
}

function getCacheKey(lat, lon, categoryId) {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${categoryId}`;
}

async function fetchFromOverpass(lat, lon, categoryId) {
  const cat   = CATEGORIES.find((c) => c.id === categoryId);
  const query = buildOverpassQuery(lat, lon, cat.filters, cat.radius);
  const resp  = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const json = await resp.json();

  return (json.elements || [])
    .map((el) => normalizePlace(el, lat, lon))
    .filter(Boolean)
    .filter((p) => p.openNow !== false) // exclude confirmed-closed; null (no tag) = keep
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, MAX_RESULTS);
}

async function fetchPlacesWithCache(lat, lon, categoryId) {
  const key = getCacheKey(lat, lon, categoryId);

  const cached = queryCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.data;

  if (inflight.has(key)) return inflight.get(key);

  const promise = fetchFromOverpass(lat, lon, categoryId)
    .then((data) => {
      queryCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      inflight.delete(key);
      return data;
    })
    .catch((err) => { inflight.delete(key); throw err; });

  inflight.set(key, promise);
  return promise;
}

// ─── OSRM batch ETA ───────────────────────────────────────────────────────────
async function fetchEtaBatch(userLat, userLon, places) {
  if (!places.length) return new Map();
  const coords = [
    `${userLon},${userLat}`,
    ...places.map((p) => `${p.lon},${p.lat}`),
  ].join(";");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const json = await resp.json();
    const durations = json.durations?.[0];
    const map = new Map();
    places.forEach((p, i) => {
      const secs = durations?.[i + 1];
      if (secs != null && secs > 0) map.set(p.id, Math.round(secs / 60));
    });
    return map;
  } catch {
    return new Map(); // ETA is best-effort; silence failures
  }
}

// ─── Wikidata brand logo (P154 → Wikimedia Commons FilePath) ─────────────────
async function resolveBrandLogo(qid) {
  if (!qid) return null;

  const mem = brandCache.get(qid);
  if (mem && Date.now() < mem.expires) return mem.logoUrl;

  const lsKey = `wd_brand_${qid}`;
  try {
    const ls = JSON.parse(localStorage.getItem(lsKey) || "null");
    if (ls && Date.now() < ls.expires) {
      brandCache.set(qid, ls);
      return ls.logoUrl;
    }
  } catch {}

  try {
    const resp = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`
    );
    const json    = await resp.json();
    const file    = json.entities?.[qid]?.claims?.P154?.[0]?.mainsnak?.datavalue?.value;
    const logoUrl = file
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=80`
      : null;
    const entry = { logoUrl, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 };
    brandCache.set(qid, entry);
    try { localStorage.setItem(lsKey, JSON.stringify(entry)); } catch {}
    return logoUrl;
  } catch {
    return null;
  }
}

// ─── Keyframe styles (injected once) ─────────────────────────────────────────
const KEYFRAMES = `
  @keyframes places-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes places-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function OpenPill({ openNow, label }) {
  if (openNow === null) return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "6px 10px", borderRadius: 999,
      background: openNow ? C.openBg : C.closedBg,
      border: `1px solid ${openNow ? C.openLine : C.closedLine}`,
      color: openNow ? C.openFg : C.closedFg,
      font: "500 10px/1 'JetBrains Mono', monospace",
      letterSpacing: "0.14em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: openNow ? C.openFg : C.closedFg, flexShrink: 0,
      }} />
      {openNow ? `Open${label ? ` · ${label}` : ""}` : `Closed${label ? ` · ${label}` : ""}`}
    </div>
  );
}

function DistancePill({ distanceMi, etaMinutes }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "6px 12px", borderRadius: 999,
      background: C.pillBg, backdropFilter: "blur(8px)",
      border: `1px solid ${C.pillLine}`,
      color: C.text, fontSize: 13, fontWeight: 600,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ color: C.arrowBlue, fontSize: 11, fontWeight: 700 }}>↗</span>
      {distanceMi.toFixed(1)} mi{etaMinutes != null ? ` · ${etaMinutes} min` : ""}
    </div>
  );
}

function AttributeChip({ label, warn }) {
  return (
    <span style={{
      padding: "4px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
      background: warn ? C.warnBg   : C.chipBg,
      color:      warn ? C.warnFg   : C.chipFg,
      border:     `1px solid ${warn ? C.warnLine : C.chipLine}`,
    }}>
      {label}
    </span>
  );
}

function BrandPanel({ place, featured }) {
  const [logoUrl, setLogoUrl]     = useState(null);
  const [logoFailed, setLogoFail] = useState(false);

  useEffect(() => {
    if (!place.brandQid) return;
    resolveBrandLogo(place.brandQid).then((url) => { if (url) setLogoUrl(url); });
  }, [place.brandQid]);

  return (
    <div style={{
      position: "relative", flexShrink: 0,
      minHeight: featured ? 220 : 110,
      background: `linear-gradient(135deg, ${place.brandColor} 0%, ${place.brandColor}99 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {logoUrl && !logoFailed ? (
        <img
          src={logoUrl}
          alt={place.name}
          onError={() => setLogoFail(true)}
          style={{
            maxHeight: featured ? 80 : 46,
            maxWidth: "60%",
            objectFit: "contain",
            filter: "brightness(0) invert(1)",
            opacity: 0.85,
          }}
        />
      ) : (
        <span style={{
          fontSize: featured ? 52 : 30, fontWeight: 700,
          color: "rgba(255,255,255,0.22)", letterSpacing: "-0.02em",
          userSelect: "none",
        }}>
          {place.monogram}
        </span>
      )}

      <div style={{ position: "absolute", top: 12, left: 12 }}>
        <OpenPill openNow={place.openNow} label={place.hoursLabel} />
      </div>
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <DistancePill distanceMi={place.distanceMi} etaMinutes={place.etaMinutes} />
      </div>
    </div>
  );
}

function CardBody({ place, featured }) {
  const chips = featured ? place.chips.slice(0, 6) : place.chips.slice(0, 3);
  const cuisine = place.cuisine?.toLowerCase() !== place.primaryType?.toLowerCase() ? place.cuisine : null;
  const meta  = [place.primaryType, cuisine].filter(Boolean).join(" · ");

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: featured ? 18 : 15, fontWeight: 700,
          color: C.text, letterSpacing: "-0.01em", lineHeight: 1.2,
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: featured ? 2 : 1,
          WebkitBoxOrient: "vertical",
        }}>
          {place.name}
        </span>
        {/* Navigate affordance — decorative; tap handled by card wrapper */}
        <div aria-hidden style={{
          width: 36, height: 36, flexShrink: 0,
          background: "#ffffff", borderRadius: 10,
          display: "grid", placeItems: "center",
          color: C.ink, pointerEvents: "none",
        }}>
          <FiNavigation size={15} />
        </div>
      </div>

      {meta && (
        <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.3 }}>{meta}</div>
      )}

      {featured && place.address && (
        <div style={{
          fontSize: 12, color: C.mute, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {place.address}
        </div>
      )}

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
          {chips.map((c) => <AttributeChip key={c.label} label={c.label} warn={c.warn} />)}
        </div>
      )}
    </div>
  );
}

function PlaceCard({ place, featured, onNavigate }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(place)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNavigate(place)}
      style={{
        display: "flex", flexDirection: "column",
        background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 16, overflow: "hidden",
        cursor: "pointer", outline: "none",
        gridRow: featured ? "span 2" : undefined,
        WebkitTapHighlightColor: "transparent",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      <BrandPanel place={place} featured={featured} />
      <CardBody  place={place} featured={featured} />
    </div>
  );
}

function SkeletonCard({ featured }) {
  const shimmer = {
    background: `linear-gradient(90deg, ${C.card} 25%, #1e2530 50%, ${C.card} 75%)`,
    backgroundSize: "200% 100%",
    animation: "places-shimmer 1.5s infinite",
  };
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 16, overflow: "hidden",
      gridRow: featured ? "span 2" : undefined,
    }}>
      <div style={{ minHeight: featured ? 220 : 110, flexShrink: 0, ...shimmer }} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 15, width: "65%", borderRadius: 6, ...shimmer }} />
        <div style={{ height: 11, width: "45%", borderRadius: 6, ...shimmer }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Places() {
  const { lat, long } = useContext(TeslaAppContext);
  const [categoryId, setCategoryId] = useState("restaurants");
  const [places,     setPlaces]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const categoryRef = useRef(categoryId);
  categoryRef.current = categoryId;

  const loadPlaces = useCallback(async (forceCategoryId) => {
    const cat = forceCategoryId ?? categoryRef.current;
    if (!lat || !long) return;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchPlacesWithCache(lat, long, cat);
      if (cat !== categoryRef.current) return; // stale response
      setPlaces(results);

      const etaMap = await fetchEtaBatch(lat, long, results);
      if (cat !== categoryRef.current) return;
      if (etaMap.size) {
        setPlaces((prev) => prev.map((p) => ({ ...p, etaMinutes: etaMap.get(p.id) ?? null })));
      }
    } catch (err) {
      if (cat !== categoryRef.current) return;
      setError(err.message || "Failed to load places");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [lat, long]);

  // Initial load + location changes
  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  const handleCategoryChange = useCallback((id) => {
    setCategoryId(id);
    setPlaces([]); // show skeletons immediately
    loadPlaces(id);
  }, [loadPlaces]);

  const handleRefresh = useCallback(() => {
    queryCache.delete(getCacheKey(lat, long, categoryId));
    loadPlaces();
  }, [lat, long, categoryId, loadPlaces]);

  const navigate = useCallback((place) => {
    window.open(`https://maps.google.com/?q=${place.lat},${place.lon}`, "_blank");
  }, []);

  const showSkeletons = loading && places.length === 0;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Category chips + refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {CATEGORIES.map(({ id, label, Icon }) => {
            const active = id === categoryId;
            return (
              <button
                key={id}
                onClick={() => handleCategoryChange(id)}
                style={{
                  flex: 1, height: 64,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                  borderRadius: 14, fontSize: 13, fontWeight: 600,
                  background: active ? "#ffffff" : "#1a1f28",
                  color:      active ? C.ink    : C.mute,
                  border:     `1px solid ${active ? "#ffffff" : C.line}`,
                  cursor: "pointer", transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
            style={{
              width: 64, height: 64, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1a1f28", border: `1px solid ${C.line}`,
              borderRadius: 14, cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.4 : 1, transition: "opacity 0.15s",
            }}
          >
            <FiRefreshCw
              size={18}
              color={C.mute}
              style={loading ? { animation: "places-spin 1s linear infinite" } : undefined}
            />
          </button>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 24 }}>
              <FiAlertCircle size={36} color="#f87171" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Places Unavailable</p>
              <p style={{ color: C.mute, fontSize: 13, marginBottom: 16 }}>{error}</p>
              <button
                onClick={handleRefresh}
                style={{ padding: "10px 24px", background: "#fff", color: C.ink, fontWeight: 600, borderRadius: 12, cursor: "pointer" }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* 2 × 3 grid (featured card spans 2 rows) */}
        {!error && (
          <div style={{
            flex: 1, minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "1fr 1fr",
            gap: 14,
          }}>
            {showSkeletons
              ? [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} featured={i === 0} />)
              : places.map((place, i) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    featured={i === 0}
                    onNavigate={navigate}
                  />
                ))
            }
          </div>
        )}

        {/* OSM attribution */}
        <div style={{
          flexShrink: 0, textAlign: "right",
          fontSize: 10, color: C.dim, paddingRight: 2,
        }}>
          © <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.dim, textDecoration: "underline" }}
          >
            OpenStreetMap contributors
          </a> · ODbL
        </div>
      </div>
    </>
  );
}
