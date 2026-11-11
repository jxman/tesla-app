// Shared helpers for the /api/* Netlify function.

export const USER_AGENT = "TeslaDashboard/1.0 (+https://github.com/jxman/tesla-app)";

/** An error whose message is safe to show to the browser. */
export class HttpError extends Error {
  constructor(status, message, { retryable = false } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * JSON response. Pass `cache` to make a 200 response cacheable on Netlify's CDN:
 *   { cdn: seconds, swr: seconds, browser: seconds, vary: ["param", ...] }
 * `vary` lists the query params in the CDN cache key. Any other params are left
 * out of the key, so extra junk params can't be used to bypass the cache.
 */
export function json(body, { status = 200, cache } = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (cache && status === 200) {
    headers["Cache-Control"] = `public, max-age=${cache.browser ?? 60}`;
    headers["Netlify-CDN-Cache-Control"] =
      `public, durable, max-age=${cache.cdn}, stale-while-revalidate=${cache.swr ?? cache.cdn}`;
    headers["Netlify-Vary"] = `query=${cache.vary.join("|")}`;
  } else {
    headers["Cache-Control"] = "no-store";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    return json({ error: err.message, retryable: err.retryable }, { status: err.status });
  }
  // Unexpected errors: log details server-side and return a generic message.
  // Never echo raw errors back: upstream URLs can contain API keys.
  console.error("Unhandled API error:", err);
  return json({ error: "Something went wrong. Please try again.", retryable: true }, { status: 500 });
}

/** fetch() with a timeout and the app's User-Agent. */
export async function fetchWithTimeout(url, { timeoutMs = 8000, headers, ...init } = {}) {
  return fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Reads a numeric query param, checks its range and rounds it. */
export function parseCoord(params, name, min, max, decimals) {
  const raw = params.get(name);
  const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `Invalid or missing "${name}"`);
  }
  return Number(n.toFixed(decimals));
}

/** Reads a query param that must be one of `allowed`. */
export function parseEnum(params, name, allowed) {
  const value = params.get(name);
  if (!allowed.includes(value)) {
    throw new HttpError(400, `Invalid or missing "${name}"`);
  }
  return value;
}

export function haversineMi(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
