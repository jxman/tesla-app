import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { openDirections, PLACE_TAP_ACTION } from "../shared/directions";
import PlaceSheet from "./PlaceSheet";
import opening_hours from "opening_hours";
import { chargingInfo, chargingSummary } from "../shared/charging";
import {
  FiNavigation, FiRefreshCw, FiAlertCircle, FiMapPin,
  FiCoffee, FiZap, FiHome, FiShoppingBag, FiStar, FiTool,
} from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";
import { PLACE_CATEGORIES } from "../shared/placeCategories";
import { getPlaces } from "../api/client";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ink:         "var(--ink)",
  card:        "var(--card)",
  line:        "var(--line)",
  text:        "var(--text)",
  mute:        "var(--mute)",
  dim:         "var(--dim)",
  arrowBlue:   "var(--arrowBlue)",
  pillBg:      "var(--pillBg)",
  pillLine:    "var(--pillLine)",
  openBg:      "rgba(34,197,94,0.18)",
  openFg:      "var(--open-fg)",
  openLine:    "rgba(34,197,94,0.35)",
  closedBg:    "rgba(239,68,68,0.18)",
  closedFg:    "var(--closed-fg)",
  closedLine:  "rgba(239,68,68,0.4)",
  chipBg:      "var(--chipBg)",
  chipFg:      "var(--chipFg)",
  chipLine:    "var(--chipLine)",
  warnBg:      "rgba(245,158,11,0.15)",
  warnFg:      "var(--warn-fg)",
  warnLine:    "rgba(245,158,11,0.3)",
};

// 8-color hash palette for brand panels (no Wikidata logo)
const BRAND_PALETTE = [
  "#1e3a5f", "#3a1e5f", "#1e4d3a", "#5f3a1e",
  "#4a1e3a", "#1e4a5f", "#4a3a1e", "#2a1e5f",
];

// ─── Category definitions ─────────────────────────────────────────────────────
// Search radius + Geoapify category keys live in src/shared/placeCategories.js (shared
// with the /api/places function); only UI labels and icons are defined here.
const CATEGORY_UI = {
  restaurants: { label: "Food",     Icon: FiCoffee      },
  charging:    { label: "Charging", Icon: FiZap         },
  lodging:     { label: "Hotels",   Icon: FiHome        },
  shopping:    { label: "Shopping", Icon: FiShoppingBag },
  fun:         { label: "Fun",      Icon: FiStar        },
  services:    { label: "Services", Icon: FiTool        },
};
const CATEGORIES = PLACE_CATEGORIES.map((c) => ({ ...c, ...CATEGORY_UI[c.id] }));

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

// "679;681;697" → "679–697" (OSM lists every number on multi-unit buildings)
function formatHouseNumber(raw) {
  if (!raw) return null;
  const nums = raw.split(/[;,]/).map((n) => n.trim()).filter(Boolean);
  return nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums[0] || null;
}

/** "840 Providence Highway, Dedham" — null when there's no real street. */
function formatAddress(tags) {
  const street = tags["addr:street"];
  // Geoapify falls back to the place name when OSM has no street; skip that.
  if (!street || street.toLowerCase() === (tags.name || "").toLowerCase()) return null;
  const line = [formatHouseNumber(tags["addr:housenumber"]), street].filter(Boolean).join(" ");
  return tags["addr:city"] ? `${line}, ${tags["addr:city"]}` : line;
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

function extractChips(tags, charging) {
  const chips = CHIP_DEFS.flatMap(({ tag, label }) => {
    const val = tags[tag];
    if (!val || val === "no") return [];
    return [{ label, warn: val === "limited" }];
  });
  if (charging) {
    if (charging.free) chips.unshift({ label: "Free" });
    if (charging.customersOnly) chips.push({ label: "Customers only", warn: true });
    if (charging.network && !(tags.name || "").toLowerCase().includes(charging.network.toLowerCase())) {
      chips.push({ label: charging.network });
    }
  }
  const stars = Number.parseFloat(tags.stars);
  if (Number.isFinite(stars) && stars > 0 && stars <= 5) chips.unshift({ label: `${stars}★` });
  const rooms = Number.parseInt(tags.rooms, 10);
  if (Number.isFinite(rooms) && rooms > 0) chips.push({ label: `${rooms} rooms` });
  return chips;
}

function isDisusedOrAbandoned(tags) {
  return (
    Object.keys(tags).some((k) => k.startsWith("disused:") || k.startsWith("abandoned:")) ||
    Boolean(tags.fixme)
  );
}

// ─── Place normalizer ─────────────────────────────────────────────────────────
function normalizePlace(el, userLat, userLon) {
  // OSM tags are strings, but Geoapify can send numbers (and CDN-cached
  // responses from before the server fix may still contain them)
  const tags = Object.fromEntries(
    Object.entries(el.tags || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  );
  if (!tags.name || /^\d+$/.test(tags.name.trim()) || isDisusedOrAbandoned(tags)) return null;

  // /api/places already flattens way/relation centers into lat/lon
  const { lat, lon } = el;
  if (lat == null || lon == null) return null;

  const hours      = parseOpeningHours(tags.opening_hours);
  const distanceMi = haversine(userLat, userLon, lat, lon);
  const charging   = chargingInfo(tags);
  const cuisine    = tags.cuisine
    ? tags.cuisine.split(/[;|]/)[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return {
    id:           `${el.type}_${el.id}`,
    name:         tags.name,
    // Chargers: plugs, speed and stalls matter more than "Charging Station"
    primaryType:  charging ? chargingSummary(charging) : humanizeType(tags),
    chargeRank:   charging ? charging.rank : 0,
    cuisine,
    address:      formatAddress(tags),
    lat, lon,
    distanceMi,
    etaMinutes:   el.etaMinutes ?? null,
    openNow:      hours ? hours.openNow : null,
    hoursLabel:   hours ? hours.label   : null,
    chips:        extractChips(tags, charging),
    brandQid:     tags["brand:wikidata"] || null,
    brandColor:   hashBrand(tags.name),
    brandLogoUrl: null,
    monogram:     makeMonogram(tags.name),
    phone:        tags.phone || tags["contact:phone"] || null,
    website:      tags.website || tags["contact:website"] || null,
  };
}

// ─── Places fetcher ───────────────────────────────────────────────────────────
// Geoapify + OSRM are queried server-side by /api/places (keys stay on the
// server). The server returns up to 20 nearest candidates with drive
// times; opening hours are evaluated here, in the user's local time.
const CACHE_TTL_MS  = 10 * 60 * 1000; // 10 min
const MAX_RESULTS   = 5;               // 1 featured + 4 regular

function getCacheKey(lat, lon, categoryId) {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${categoryId}`;
}

async function fetchFromApi(lat, lon, categoryId) {
  const { places = [] } = await getPlaces(lat, lon, categoryId);
  return places
    .map((el) => normalizePlace(el, lat, lon))
    .filter(Boolean)
    .filter((p) => p.openNow !== false) // exclude confirmed-closed; null (no tag) = keep
    // Chargers: Tesla plugs first, then CCS (adapter), then unknown, then other
    // plugs; nearest first within each group. Other categories: rank is 0.
    .sort((a, b) => a.chargeRank - b.chargeRank || a.distanceMi - b.distanceMi)
    .slice(0, MAX_RESULTS);
}

async function fetchPlacesWithCache(lat, lon, categoryId) {
  const key = getCacheKey(lat, lon, categoryId);

  const cached = queryCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.data;

  if (inflight.has(key)) return inflight.get(key);

  const promise = fetchFromApi(lat, lon, categoryId)
    .then((data) => {
      queryCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      inflight.delete(key);
      return data;
    })
    .catch((err) => { inflight.delete(key); throw err; });

  inflight.set(key, promise);
  return promise;
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
  } catch { /* localStorage unavailable or corrupt — fall through to network */ }

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
    try { localStorage.setItem(lsKey, JSON.stringify(entry)); } catch { /* best-effort cache */ }
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
  /* Short viewports (Tesla in-car browser ~601px tall): small cards drop their
     attribute chips and brand mark (the panel shrinks to a colour band) so
     name, distance and open status stay visible */
  @media (max-height: 760px) {
    .places-chips-secondary,
    .places-brandmark-secondary { display: none !important; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
// Open/closed status. Sits in the card body (not over the brand panel), so it
// uses theme-aware text tokens. `compact` drops the hours label for narrow cards.
function OpenPill({ openNow, label, compact }) {
  if (openNow === null) return null;
  const text = openNow ? "Open" : "Closed";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999,
      background: openNow ? C.openBg : C.closedBg,
      border: `1px solid ${openNow ? C.openLine : C.closedLine}`,
      color: openNow ? C.openFg : C.closedFg,
      fontSize: "clamp(13px, 2.2vh, 15px)", fontWeight: 600, lineHeight: 1.2,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: openNow ? C.openFg : C.closedFg, flexShrink: 0,
      }} />
      {!compact && label ? `${text} · ${label}` : text}
    </div>
  );
}

function DistancePill({ distanceMi, etaMinutes }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 999,
      background: C.pillBg,
      border: `1px solid ${C.pillLine}`,
      color: C.text, fontSize: "clamp(14px, 2.4vh, 16px)", fontWeight: 600, lineHeight: 1.2,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ color: C.arrowBlue, fontSize: "0.85em", fontWeight: 700 }}>↗</span>
      {distanceMi.toFixed(1)} mi{etaMinutes != null ? ` · ${etaMinutes} min` : ""}
    </div>
  );
}

function AttributeChip({ label, warn }) {
  return (
    <span style={{
      padding: "4px 10px", borderRadius: 999,
      fontSize: "clamp(12px, 2vh, 14px)", fontWeight: 500, whiteSpace: "nowrap",
      background: warn ? C.warnBg   : C.chipBg,
      color:      warn ? C.warnFg   : C.chipFg,
      border:     `1px solid ${warn ? C.warnLine : C.chipLine}`,
    }}>
      {label}
    </span>
  );
}

// Brand panel flexes to whatever height the card body leaves over — on the
// short Tesla viewport it shrinks to a colour band rather than hiding the body.
function BrandPanel({ place, featured }) {
  const [logoUrl, setLogoUrl]     = useState(null);
  const [logoFailed, setLogoFail] = useState(false);

  useEffect(() => {
    if (!place.brandQid) return;
    resolveBrandLogo(place.brandQid).then((url) => { if (url) setLogoUrl(url); });
  }, [place.brandQid]);

  return (
    <div style={{
      position: "relative", flex: 1, minHeight: featured ? 40 : 0,
      background: `linear-gradient(135deg, ${place.brandColor} 0%, ${place.brandColor}99 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {logoUrl && !logoFailed ? (
        <div className={featured ? undefined : "places-brandmark-secondary"} style={{
          background: "white",
          borderRadius: 8,
          padding: featured ? "6px 12px" : "3px 8px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img
            src={logoUrl}
            alt={place.name}
            onError={() => setLogoFail(true)}
            style={{
              maxHeight: featured ? "clamp(28px, 8vh, 72px)" : "clamp(14px, 3.5vh, 40px)",
              maxWidth: "80%",
              objectFit: "contain",
            }}
          />
        </div>
      ) : (
        <span className={featured ? undefined : "places-brandmark-secondary"} style={{
          fontSize: featured ? "clamp(32px, 7vh, 60px)" : "clamp(16px, 4vh, 34px)", fontWeight: 700,
          color: "rgba(255,255,255,0.22)", letterSpacing: "-0.02em",
          userSelect: "none",
        }}>
          {place.monogram}
        </span>
      )}
    </div>
  );
}

function CardBody({ place, featured }) {
  const chips = featured ? place.chips.slice(0, 6) : place.chips.slice(0, 3);
  const cuisine = place.cuisine?.toLowerCase() !== place.primaryType?.toLowerCase() ? place.cuisine : null;
  const meta  = [place.primaryType, cuisine].filter(Boolean).join(" · ");

  return (
    <div style={{ padding: "clamp(8px, 1.6vh, 14px)", display: "flex", flexDirection: "column", gap: "clamp(4px, 0.8vh, 8px)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: featured ? "clamp(18px, 3.2vh, 22px)" : "clamp(16px, 2.8vh, 19px)", fontWeight: 700,
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
          width: 32, height: 32, flexShrink: 0,
          background: "var(--text)", borderRadius: 9,
          display: "grid", placeItems: "center",
          color: "var(--ink)", pointerEvents: "none",
        }}>
          <FiNavigation size={15} />
        </div>
      </div>

      {meta && (
        <div style={{ fontSize: "clamp(13px, 2.3vh, 15px)", color: C.mute, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</div>
      )}

      {place.address && (
        <div title={place.address} style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: featured ? "clamp(13px, 2.3vh, 15px)" : "clamp(12px, 2.1vh, 14px)", color: C.mute, lineHeight: 1.3,
          minWidth: 0,
        }}>
          <FiMapPin size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.address}</span>
        </div>
      )}

      {/* Distance + open status — the info a driver needs most */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <DistancePill distanceMi={place.distanceMi} etaMinutes={place.etaMinutes} />
        <OpenPill openNow={place.openNow} label={place.hoursLabel} compact={!featured} />
      </div>

      {chips.length > 0 && (
        <div className={featured ? undefined : "places-chips-secondary"} style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
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
        display: "flex", flexDirection: "column", minHeight: 0,
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
    background: `linear-gradient(90deg, var(--card) 25%, var(--shimmer-peak) 50%, var(--card) 75%)`,
    backgroundSize: "200% 100%",
    animation: "places-shimmer 1.5s infinite",
  };
  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: 0,
      background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 16, overflow: "hidden",
      gridRow: featured ? "span 2" : undefined,
    }}>
      <div style={{ flex: 1, minHeight: 0, ...shimmer }} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <div style={{ height: 17, width: "65%", borderRadius: 6, ...shimmer }} />
        <div style={{ height: 13, width: "45%", borderRadius: 6, ...shimmer }} />
        <div style={{ height: 22, width: "55%", borderRadius: 999, ...shimmer }} />
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
  const [selected,   setSelected]   = useState(null);
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
    if (PLACE_TAP_ACTION === "directions") openDirections({ lat, lon: long }, place);
    else setSelected(place);
  }, [lat, long]);
  const closeSheet = useCallback(() => setSelected(null), []);

  const showSkeletons = loading && places.length === 0;

  return (
    <>
      <style>{KEYFRAMES}</style>
      {selected && (
        <PlaceSheet
          from={{ lat, lon: long }}
          onClose={closeSheet}
          place={{
            ...selected,
            subtitle: [selected.primaryType, selected.cuisine !== selected.primaryType ? selected.cuisine : null].filter(Boolean).join(" · "),
            travel: [
              selected.distanceMi != null ? `${selected.distanceMi.toFixed(1)} mi` : null,
              selected.etaMinutes != null ? `about ${selected.etaMinutes} min drive` : null,
            ].filter(Boolean).join(" · ") || null,
          }}
        />
      )}
      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "clamp(8px, 1.6vh, 14px)" }}>

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
                  borderRadius: 14, fontSize: "clamp(14px, 2.4vh, 16px)", fontWeight: 600,
                  background: active ? "var(--text)" : "var(--cat-inactive)",
                  color:      active ? "var(--ink)"  : C.mute,
                  border:     `1px solid ${active ? "var(--line)" : C.line}`,
                  cursor: "pointer", transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Icon size={18} />
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
              background: "var(--cat-inactive)", border: `1px solid ${C.line}`,
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
              <p style={{ color: C.text, fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Places Unavailable</p>
              <p style={{ color: C.mute, fontSize: 15, marginBottom: 16 }}>{error}</p>
              <button
                onClick={handleRefresh}
                style={{ padding: "10px 24px", background: "var(--text)", color: "var(--ink)", fontWeight: 600, borderRadius: 12, cursor: "pointer" }}
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
            gap: "clamp(8px, 1.6vh, 14px)",
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

        {/* Data attribution (required by Geoapify's free plan and the OSM ODbL licence) */}
        <div style={{
          flexShrink: 0, textAlign: "right",
          fontSize: 12, color: C.mute, paddingRight: 2,
        }}>
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.mute, textDecoration: "underline" }}
          >
            Powered by Geoapify
          </a> · © <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.mute, textDecoration: "underline" }}
          >
            OpenStreetMap contributors
          </a> · ODbL
        </div>
      </div>
    </>
  );
}
