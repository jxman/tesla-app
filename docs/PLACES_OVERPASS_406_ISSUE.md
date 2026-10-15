# Places tab: Overpass API blocking browser requests (406 / "Failed to fetch")

**Status:** Open — root cause confirmed, fix identified, not yet implemented (deferred by request 2026-08-23).

## Summary

The Places tab intermittently (now effectively **always**, from a browser) fails with:

> **Places Unavailable** — Failed to fetch

This is **not a regression in this app's code**. On **2026-04-19/20**, the Overpass API maintainers deliberately rolled out aggressive server-side anti-bot "banning rules" to fight overload on the free public `overpass-api.de` service. Those rules block exactly the kind of request a browser-based client-side app is forced to send, so every browser-based Overpass consumer — not just this app — broke around that date.

The current code (`src/components/Places.jsx`) calls `overpass-api.de` directly from the browser with `fetch()`. There is no backend in this project, so there is no way today to route around the block from client-side JavaScript alone.

**Official policy page:** [Overpass API — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API). It states: *"Be sure to check that your app or website adds `User-Agent` or `Referer` headers to requests that uniquely identify your app. If you receive an HTTP error code 429, pause for 30 seconds before making a new request."* Notably, this is the opposite of what the new filter enforces for browser traffic — it asks for identifying headers, but a browser's `User-Agent` is generic (not app-identifying) by construction, so client-side apps get blocked despite technically complying with the spirit of the policy.

## Root cause — confirmed with direct testing

Isolated, reproducible `curl` tests against `https://overpass-api.de/api/interpreter` (same query every time):

| Request headers | Result |
|---|---|
| No special headers (curl default identity) | ✅ 200 OK |
| `Referer: https://example.com/` | ✅ 200 OK |
| `Referer: https://teslaweather.netlify.app/` | ❌ 406 Not Acceptable |
| `Referer: https://any-random-app.netlify.app/` | ❌ 406 Not Acceptable |
| Real Chrome `User-Agent` string, nothing else | ❌ 406 Not Acceptable |

Two independent triggers, either one alone is sufficient to get blocked:

1. **`Referer` containing `*.netlify.app`** — collateral damage from anti-abuse rules targeting free-hosting subdomains commonly used for disposable scraper deployments.
2. **A `User-Agent` that looks like a genuine browser** (`Mozilla/5.0 ... Chrome/...`) — this is the one that makes a client-side fix impossible: JavaScript is forbidden from overriding `User-Agent`, so *every* real browser hitting this endpoint sends exactly the string being filtered, from any domain.

This was reproduced live against the deployed site with a real Chromium browser (Playwright), matching the user-reported error exactly — `net::ERR_FAILED` with the browser console showing a CORS block (the 406 response from Overpass's error path doesn't include `Access-Control-Allow-Origin`, so the browser reports it as a CORS failure rather than surfacing the 406 status).

Also tried as an alternative: falling back to `z.overpass-api.de` and `lz4.overpass-api.de` (sibling nodes on the same operator's cluster) — **same result**, since they share the same filtering rules. A different-operator mirror (`overpass.kumi.systems`) was down/unreachable at the time of testing, so it wasn't usable as a live fallback either, though it may be worth re-checking later.

## Timeline — confirmed upstream change

Per the OpenStreetMap community forum, an Overpass maintainer explicitly introduced these rules on **2026-04-19/20** in response to server overload:

> "Given that there is no improvement of the situation... I've started to put heavy banning rules in place on the servers."

Source: [Overpass API - Error 406 — OpenStreetMap Community Forum](https://community.openstreetmap.org/t/overpass-api-error-406/143198)

Related reading:
- [Overpass-Api Not working. Error: 406 Not Acceptable · Issue #791 · drolbr/Overpass-API](https://github.com/drolbr/Overpass-API/issues/791)
- [Fix Overpass API 406 Not Acceptable Error — Working Mirror Endpoints (CadShift Blog)](https://cadshift.com/blog/qgis-overpass-406-not-acceptable-mirror-endpoints/)
- [Overpass API — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API) (usage policy — asks API clients to send an identifying `User-Agent`/`Referer`, which is the opposite of what the new filter actually rejects for browser traffic)

## What's already shipped (does not fully fix it)

Commit `2219350` added:
- Fallback across `overpass-api.de` → `z.overpass-api.de` → `lz4.overpass-api.de`
- A 12s request timeout (there was none before)
- A clearer error message instead of the raw "Failed to fetch"

This improves resilience against transient outages/rate-limiting on one node, but **does not** fix the actual issue, since all three nodes enforce the same User-Agent-based filter.

## Recommended fix — not yet implemented

Add a small **Netlify serverless function** (`netlify/functions/overpass.js`) that calls Overpass **server-to-server**:

- A server-side request doesn't carry a browser `User-Agent` or a `netlify.app` `Referer` — it can send Overpass a proper descriptive User-Agent (e.g. `TeslaWeatherApp/1.0 (+https://teslaweather.netlify.app)`), which is literally what Overpass's own usage policy asks for.
- `Places.jsx` would call `/.netlify/functions/overpass` (same-origin — no CORS involved at all) instead of `overpass-api.de` directly.
- Trade-off: adds a new piece to the project (a backend function where there was none), and testing that specific piece locally requires the Netlify CLI (`netlify dev`) instead of plain `vite`. The rest of the app is unaffected.

## Next steps

- [ ] Implement `netlify/functions/overpass.js` proxy
- [ ] Point `Places.jsx`'s `fetchFromOverpass` at the new function
- [ ] Verify locally with `netlify dev`
- [ ] Deploy and verify against the live site
- [ ] Optionally re-check `overpass.kumi.systems` as a documented secondary mirror inside the proxy function

---
*Investigated 2026-08-23.*
