// EV charger details from OpenStreetMap tags (socket:*, capacity, fee, access,
// network). Shared by the /api/places function (which tags to keep, name
// fallback) and the Places tab (card text, Tesla-first ordering).

// OSM socket type → label a Tesla driver recognises. Order = display order.
const PLUGS = [
  { label: "Tesla",   sockets: ["nacs", "tesla_supercharger", "tesla_destination", "tesla_supercharger_ccs"] },
  { label: "CCS",     sockets: ["type1_combo", "type2_combo"] },
  { label: "CHAdeMO", sockets: ["chademo"] },
  { label: "J1772",   sockets: ["type1", "type1_cable"] },
  { label: "Type 2",  sockets: ["type2", "type2_cable"] },
];

export const isCharger = (tags) => tags?.amenity === "charging_station";

/** socket:<type> and socket:<type>:output — the only socket tags the UI reads. */
export const isKeptSocketTag = (key) => /^socket:[a-z0-9_]+(:output)?$/.test(key);

const isTeslaNetwork = (tags) =>
  [tags.network, tags.brand, tags.operator].some((v) => /tesla|supercharger/i.test(v || ""));

/** Name for a charger OSM left unnamed: brand, network or operator. */
export function chargerName(tags) {
  return tags.brand || tags.network || tags.operator || "EV charger";
}

/** Largest output in kW across sockets ("150", "6.6 kW", "50 kW;150 kW"); null if none. */
function maxKw(tags) {
  let best = null;
  for (const [k, v] of Object.entries(tags)) {
    if (!/^socket:[a-z0-9_]+:output$/.test(k)) continue;
    for (const part of String(v).split(/[;,]/)) {
      const m = part.trim().match(/^([\d.]+)\s*(kw|w)?$/i);
      if (!m) continue;
      let kw = Number(m[1]);
      if (m[2]?.toLowerCase() === "w") kw /= 1000;
      if (Number.isFinite(kw) && kw > 0 && kw <= 1000 && (best == null || kw > best)) best = kw;
    }
  }
  return best == null ? null : Math.round(best);
}

/** Plug labels present ("Tesla", "CCS", …). A Tesla network with no socket tags counts as Tesla. */
function plugLabels(tags) {
  const labels = PLUGS
    .filter(({ sockets }) => sockets.some((s) => {
      const v = tags[`socket:${s}`];
      return v != null && v !== "no" && v !== "0";
    }))
    .map((p) => p.label);
  if (!labels.length && isTeslaNetwork(tags)) labels.push("Tesla");
  return labels;
}

/**
 * Charger summary for the card, or null for non-chargers.
 * rank: 0 Tesla plug · 1 CCS (works with Tesla's adapter) · 2 unknown plugs · 3 other plugs only
 */
export function chargingInfo(tags) {
  if (!isCharger(tags)) return null;
  const plugs = plugLabels(tags);
  const stalls = Number.parseInt(tags.capacity, 10);
  const rank = plugs.includes("Tesla") ? 0 : plugs.includes("CCS") ? 1 : plugs.length ? 3 : 2;
  return {
    plugs,
    kw: maxKw(tags),
    stalls: Number.isFinite(stalls) && stalls > 0 ? stalls : null,
    network: tags.network || null,
    free: tags.fee === "no",
    customersOnly: tags.access === "customers" || tags.access === "private",
    rank,
  };
}

/** One-line summary: "Tesla · CCS · 150 kW · 8 stalls". */
export function chargingSummary(info) {
  if (!info) return null;
  const parts = [
    ...info.plugs,
    info.kw ? `${info.kw} kW` : null,
    info.stalls ? `${info.stalls} ${info.stalls === 1 ? "stall" : "stalls"}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "EV charger";
}
