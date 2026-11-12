const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Auto theme from sunrise/sunset, like the car's Auto display mode:
 * light between sunrise and sunset, dark otherwise.
 *
 * @param {number} now          epoch ms
 * @param {number} [sunriseSec] OpenWeather sys.sunrise (epoch seconds, today at the location)
 * @param {number} [sunsetSec]  OpenWeather sys.sunset
 * @returns {{ theme: "light" | "dark", nextChange: number }} nextChange = epoch ms of the next switch
 */
export function sunTheme(now, sunriseSec, sunsetSec) {
  if (!Number.isFinite(sunriseSec) || !Number.isFinite(sunsetSec) || sunsetSec <= sunriseSec) {
    return clockTheme(now);
  }
  // Shift the times by whole days so sunrise is the most recent one before now
  // (weather data can be from yesterday if the page stayed open overnight)
  const offset = Math.floor((now - sunriseSec * 1000) / DAY_MS) * DAY_MS;
  const rise = sunriseSec * 1000 + offset;
  const set = sunsetSec * 1000 + offset;
  return now < set
    ? { theme: "light", nextChange: set }
    : { theme: "dark", nextChange: rise + DAY_MS };
}

// Before weather loads: light 7:00–19:00 local time
function clockTheme(now) {
  const d = new Date(now);
  const at = (h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime();
  if (now < at(7)) return { theme: "dark", nextChange: at(7) };
  if (now < at(19)) return { theme: "light", nextChange: at(19) };
  return { theme: "dark", nextChange: at(7) + DAY_MS };
}
