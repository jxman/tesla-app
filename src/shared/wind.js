// Wind helpers for the Weather tab. OpenWeather gives wind.speed and wind.gust
// in m/s (metric units) and wind.deg as the direction the wind blows FROM.

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** 315 → "NW"; null when the direction is missing. */
export function compass(deg) {
  if (!Number.isFinite(deg)) return null;
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export const toMph = (ms) => (Number.isFinite(ms) ? Math.round(ms * 2.237) : null);

/**
 * { speed, gust, from, arrowDeg } in mph. gust is only kept when it is
 * meaningfully above the steady wind (5+ mph). arrowDeg points where the wind
 * is blowing TO, for a rotated up-arrow icon.
 */
export function describeWind(wind) {
  const speed = toMph(wind?.speed) ?? 0;
  const g = toMph(wind?.gust);
  const from = compass(wind?.deg);
  return {
    speed,
    gust: g != null && g >= speed + 5 ? g : null,
    from,
    arrowDeg: from ? (wind.deg + 180) % 360 : null,
  };
}
