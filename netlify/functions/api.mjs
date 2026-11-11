// Single entry point for /api/*. One function (instead of one per endpoint)
// lets a single rate-limit rule cover every route; Free/Starter Netlify plans
// allow only 2 code-based rules per site.
import { errorResponse, json } from "../lib/http.mjs";
import { geocode, weather } from "../lib/weather.mjs";
import { news } from "../lib/news.mjs";
import { places } from "../lib/places.mjs";
import { incidents, driveTimes, search } from "../lib/traffic.mjs";

export const routes = {
  weather,
  geocode,
  news,
  places,
  incidents,
  "drive-times": driveTimes,
  search,
};

export default async function handler(req) {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });

  const url = new URL(req.url);
  const name = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const route = Object.hasOwn(routes, name) ? routes[name] : null;
  if (!route) return json({ error: "Not found" }, { status: 404 });

  try {
    return await route(url.searchParams);
  } catch (err) {
    return errorResponse(err);
  }
}

export const config = {
  path: "/api/*",
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
