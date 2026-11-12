// Text helpers for the place details sheet (Places cards and Traffic tiles).

/** US numbers as (XXX) XXX-XXXX; other numbers unchanged. First of a ";" list. */
export function formatPhone(raw) {
  if (!raw) return null;
  const first = String(raw).split(";")[0].trim();
  const digits = first.replace(/\D/g, "");
  // 10 digits, or 11 starting with the +1 country code, is a US/NANP number
  const us = digits.length === 10 ? digits : digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : first;
}

/** "https://www.example.com/menu" → "example.com/menu"; null if not http(s). */
export function websiteLabel(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw).split(";")[0].trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return null;
  }
}

/** Drop the country Geoapify appends to saved-place addresses. */
export function shortAddress(address) {
  if (!address) return null;
  return String(address).replace(/,\s*(United States( of America)?|USA)$/i, "").trim();
}

/**
 * What to say to the car's voice assistant. A business name plus street is
 * what the car's navigation search matches best; without a street, the name.
 */
export function voicePhrase({ name, address }) {
  const addr = shortAddress(address);
  if (name && addr && !addr.toLowerCase().startsWith(name.toLowerCase())) return `Navigate to ${name}, ${addr}`;
  return `Navigate to ${addr || name}`;
}
