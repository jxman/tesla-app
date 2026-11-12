# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚨 CRITICAL RULES - ALWAYS FOLLOW

## Git & Version Control Rules
**NEVER commit or push code without explicit user permission.**

### Commit Protocol:
- ✅ **ASK FIRST**: Always ask "Would you like me to commit these changes?" 
- ✅ **WAIT FOR CONFIRMATION**: Only proceed after user explicitly says yes
- ✅ **EXCEPTION**: Only commit automatically if user message contains "commit this" or "push these changes"
- ❌ **NEVER ASSUME**: Don't assume user wants changes committed
- ❌ **NO AUTO-COMMITS**: Never commit just because you finished implementing something

### Example Correct Behavior:
```
Assistant: I've successfully implemented the button uniformity improvements. 
Would you like me to commit and push these changes?

User: Yes, go ahead
Assistant: [proceeds with git commands]
```

**REMINDER**: Being proactive about code commits makes users feel you're overstepping boundaries.

## Project Overview

Tesla Dashboard is a React-based web application with a modern tabbed interface designed as a homepage replacement for Tesla vehicle browsers. It provides enhanced weather forecasts, traffic conditions, news updates, and real nearby places in a Tesla-optimized interface.

**Key Features:**
- **Tabbed Navigation**: 4-tab interface (Weather, Traffic, News, Places) with Feather icon labels and white-pill active state
- **Enhanced Weather**: Option B hero with a Driving insight card (conditions + estimated cold-weather range loss) + 12-hour temperature sparkline; react-icons/wi weather icons (per-condition colors); 5-Day / 6-Hour forecast toggle
- **Real Places Integration**: Geoapify Places (OpenStreetMap data) + OSRM — 2×3 image-grid layout (featured card spans 2 rows), 6 EV-specific categories (no Gas), opening hours parsing, brand panel with Wikidata logo lookup, attribute chips, OSM attribution
- **Live News Feed**: 6 categories (Headlines, Tech, Business, Science, Sports, Entertainment) from free-to-read RSS feeds merged server-side; stacked icon-over-label category buttons so 6 fit at Tesla width; headline rows with DOMPurify-sanitized, lazy-loaded thumbnails (the function rewrites NPR/Variety/Deadline/CBS Sports image URLs to 240 px via `thumbnailUrl`)
- **Server-side API layer**: one Netlify Function (`netlify/functions/api.mjs`, path `/api/*`) proxies OpenWeather, RSS, Geoapify and OSRM; keys stay server-side and the Netlify CDN caches responses
- **Traffic Conditions**: full-width Traffic card (TomTom): drive times with arrival times to saved places (left column) + traffic near me (right column); no map embed
- **Touch-Optimized**: 64 px chip/tab targets, whole-card tap targets on Places, Tesla browser compatible
- **Change location**: header button (map pin + "Change location") opens zip-code entry and a use-current-location button
- **Light/Dark Mode**: Auto by default: light between sunrise and sunset from the weather data (`src/shared/sunTheme.js`; local clock 7:00–19:00 before weather loads), like the car's Auto display. The sun/moon button overrides until the next sunrise/sunset (`tesla.themeOverride.v1`); tapping back to the Auto value clears it; an "A" badge shows Auto. `ThemeProvider` sits inside `TeslaAppProvider` to read `data.sys`. A TEMPORARY dashed "Browser: …" pill in the header shows `prefers-color-scheme` for an in-car test of whether the Tesla browser follows the car's Day/Night setting — remove it after the test; CSS custom properties switch all color tokens; Tailwind `dark:` class strategy
- **Tesla-themed UI**: Dark ink theme (`#0e1014` background) with Inter + JetBrains Mono typography; light mode uses `#f0f4f8` background

## Development Commands

### Build Tool: Vite
This project uses **Vite** for fast development and optimized production builds. Migrated from Create React App to resolve security vulnerabilities and improve performance.

### Essential Commands
- **Start development server**: `npm start` or `npm run dev` — runs `netlify dev` on port 3000 (proxies Vite on 5173 and serves `/api/*` functions; loads `.env`). Requires the global Netlify CLI (`npm install -g netlify-cli`)
- **Vite only (no /api)**: `npm run dev:vite`
- **Build for production**: `npm run build` (output: `build/`)
- **Preview production build**: `npm run preview` (runs on port 4173)
- **Run tests**: `npm test` (Vitest, `tests/unit/`; `npm run test:watch` for watch mode)
- **Lint**: `npm run lint` (ESLint; also runs on staged files at commit time)

### Development Testing Protocol
**For Claude Code development assistance:**
- **User's server**: Always runs on port 3000 (`http://localhost:3000`)
- **Testing changes**: `netlify dev --port 3005 --target-port 5175 --command "npx vite --port 5175 --strictPort"` (needs `OPENWEATHER_API_KEY` in `.env` or the shell). Plain `npx vite --port 3005` works for UI-only changes, but `/api/*` won't respond
- **Always test compilation** before asking user to verify changes

### Environment Variables
- **Secrets are server-side only**: `OPENWEATHER_API_KEY`, `GEOAPIFY_API_KEY` and `TOMTOM_API_KEY` are read by the Netlify Function via `process.env`. Never give a secret a `VITE_` prefix — Vite builds every `VITE_*` variable into the public bundle
- **Public build-time settings** use the `VITE_` prefix and `import.meta.env.VITE_*` (only `VITE_DEFAULT_LAT`/`VITE_DEFAULT_LON` today)

### Performance Improvements from Vite Migration
- **Dev server startup**: ~20-30s → ~150ms (100x+ faster)
- **Hot Module Replacement**: ~1-3s → <500ms (5x+ faster)
- **Production build size**: 5.6MB → 2.5MB (55% reduction)
- **Production build time**: ~30s → ~1s (30x faster)
- **Security**: Resolved webpack-dev-server CVE-2025-30360

### Linting & Pre-commit Hooks
- **ESLint 9** flat config in `eslint.config.mjs` (`@eslint/js` recommended + `eslint-plugin-react` + `react-hooks` rules-of-hooks/exhaustive-deps). `.js` files in `src/` contain JSX, so JSX parsing is enabled for both extensions. No TypeScript.
- **Run lint**: `npm run lint`
- **Husky hooks** (installed by `npm install` via `"prepare": "husky"`):
  - `.husky/pre-commit`: blocks unresolved merge-conflict markers → `ggshield secret scan pre-commit` secret scan (requires `brew install ggshield` + `ggshield auth login`; fails closed if missing) → `lint-staged` (`eslint --fix` on staged `*.{js,jsx,mjs}`)
  - `.husky/commit-msg`: `commitlint` enforces Conventional Commits (`feat:`, `fix:`, `chore(deps):` …)
- **Testing the secret hook**: stage a throwaway fake of `AKIA` + 16 random characters from A–Z/2–7 (don't commit it — this hook will block it). Obvious placeholder keys such as `AKIAIOSFODNN7EXAMPLE` may not be flagged

## Project Architecture

### State Management
The application uses React Context API for global state management:

- **TeslaAppContext** (`src/context/TeslaAppContext.js`): Central state manager handling:
  - Location coordinates (lat/long) with GPS detection
  - Current weather data and 5-day forecast from OpenWeather API
  - Loading states and error handling for all APIs
  - Location search functionality (GPS + zip code)
  - Forecast data for enhanced Weather component features

### Component Structure
```
src/
├── App.js                      # Tabbed interface with state-driven navigation
├── context/
│   ├── TeslaAppContext.js     # Global state with forecast data
│   └── ThemeContext.jsx       # Auto (sunrise/sunset) + override theme; applies .dark to <html>
├── components/
│   ├── LocationSelector.jsx   # Header: Change location (zip / GPS) + sun/moon theme toggle
│   ├── Weather.jsx           # Enhanced weather with forecasts & drag scroll
│   ├── Traffic.jsx           # Traffic tab: location guard + full-width TrafficCard
│   ├── TrafficCard.jsx       # Drive times, incidents near me, nearest charger
│   ├── News.jsx             # News feed with categories
│   └── Places.jsx           # OpenStreetMap places integration
├── api/
│   └── client.js            # Browser client for /api/*
└── shared/
    ├── placeCategories.js   # Category radii + Geoapify keys (shared with the function)
    ├── charging.js          # Charger plugs/kW/stalls/rank (shared with the function)
    ├── savedPlaces.js       # Traffic saved places (localStorage)
    ├── savedLocation.js     # Last location set (localStorage)
    ├── sunTheme.js          # Light/dark from sunrise/sunset
    └── Spinner.jsx          # Loading component
```

### Layout Architecture
The app uses a modern tabbed interface:
- **Navigation**: 4 tabs (Weather, Traffic, News, Places) with icons and active states
- **Single Content Area**: Full-height viewport optimization with calc(100vh - 200px)
- **Active Tab Display**: One component visible at a time, optimized for touch interaction
- **Header**: LocationSelector with Tesla branding and search (persistent across tabs)

### API Integration Patterns

All third-party calls go through **one Netlify Function**, `netlify/functions/api.mjs` (`config.path = "/api/*"`), which routes to handlers in `netlify/lib/`. The browser calls it through `src/api/client.js` (`getWeather`, `geocodeZip`, `getNews`, `getPlaces`).

| Route | Handler | Upstream | CDN cache (`Netlify-CDN-Cache-Control: durable`) |
|---|---|---|---|
| `/api/weather?lat&lon` | `lib/weather.mjs` | OWM `/weather` + `/forecast` in parallel → `{ current, forecast }` | 10 min + 20 min SWR, vary `lat\|lon` |
| `/api/geocode?zip[&country]` | `lib/weather.mjs` | OWM `geo/1.0/zip` | 30 days, vary `zip\|country` |
| `/api/news?category` | `lib/news.mjs` | 3–4 free-to-read RSS/Atom feeds per category (`FEEDS`; no paywalled sources such as NYT), parsed with `fast-xml-parser`, merged, de-duplicated, max 4 per source, 10 total | 15 min + 30 min SWR, vary `category` |
| `/api/incidents?lat&lon` | `lib/traffic.mjs` | TomTom Orbis v2 incident details (key in `TomTom-Api-Key` header, `Attributes` header selects fields), ~16 km bbox; ranked by severity then distance, top 6 | 2 min + 2 min SWR, vary `lat\|lon` |
| `/api/drive-times?lat&lon&to=lat,lon;…` | `lib/traffic.mjs` | TomTom Orbis Routing v3 `POST routes/calculate` (`traffic: live`, `Attributes: routes.summary`, key in header; summary read via `summarizeRoute`, which accepts v3 and legacy field names), one call per destination (max 5); per-destination `{ error }` so one failure doesn't blank the card | 2 min + 2 min SWR, vary `lat\|lon\|to` |
| `/api/search?text[&lat&lon]` | `lib/traffic.mjs` | Geoapify geocode autocomplete (for adding saved places) | 1 day, vary `text\|lat\|lon` |
| `/api/places?lat&lon&cat` | `lib/places.mjs` | Geoapify Places v2 (`categories` + `filter=circle` + `bias=proximity`; raw OSM tags from `datasource.raw` mapped to the old Overpass-style element shape) + OSRM `/table` | 10 min + 20 min SWR, vary `lat\|lon\|cat` |

- **Why one function**: Free/Starter Netlify plans allow only 2 code-based rate-limit rules per site; one function = one rule (`120 req / 60 s per IP`)
- **Validation**: lat/lon range-checked and rounded server-side (2 dp weather, 3 dp places); `cat`/`category` checked against fixed lists; zip regex. Nothing user-supplied is passed through as a URL
- **Errors**: handlers throw `HttpError(status, safeMessage, { retryable })`; responses are `{ error, retryable }` with `Cache-Control: no-store`. Never include upstream URLs in errors (they contain the key)
- **Don't return 404 from a handler**: Netlify treats a function 404 as "no route" and replaces the body. "Location not found" is returned as 422
- **Places timezone rule**: the function returns up to 20 nearest candidates with raw `opening_hours`; open/closed is evaluated **in the browser** (functions run in UTC)
- **Weather errors** surface to `Weather.jsx` as an OWM-style `{ cod, message }` in context `data`
- **TomTom key permissions**: each TomTom API (Traffic, Routing) must be enabled on the key in the TomTom dashboard; a missing product returns 403 "You are not allowed to access this endpoint". The legacy `routing/1/calculateRoute` endpoint is not available to new keys
- **Traffic**: `TrafficCard.jsx` fills the tab: Drive times (left column) and Traffic near me (right column); the Waze embed was removed. Saved places (max 5) live **only in browser localStorage** (`src/shared/savedPlaces.js`, key `tesla.savedPlaces.v1`) — never stored server-side, because the site is public. Card refreshes every 3 min **only while the page is visible** (`visibilitychange`; refreshes on return if stale) to save TomTom quota. A **Nearest Tesla/fast charger** row (`useNearestCharger`) reuses `/api/places?cat=charging` (CDN-cached) and ranks with `chargingInfo` (Tesla plug, then CCS). **Brand logos**: Wikidata is still called from the browser (allows CORS, 30-day localStorage cache)

## Environment Configuration

See `.env.example`. Locally, `netlify dev` loads `.env`. In Netlify, set `OPENWEATHER_API_KEY`, `GEOAPIFY_API_KEY` and `TOMTOM_API_KEY` (scope: Functions, marked **Contains secret values** so secrets scanning fails any build that leaks them, with a value in **every deploy context** — draft deploys run as Deploy Previews and get no value otherwise). News needs no key (RSS).

## Styling Architecture

**CSS Framework**: Tailwind CSS (no component library) for structural layout; inline styles for design tokens
**Dark mode**: `darkMode: 'class'` in `tailwind.config.js`; ThemeContext applies/removes `.dark` on `<html>`
**Theme tokens**: All color tokens are CSS custom properties defined in `src/index.css`. `:root` holds light values; `.dark` overrides to dark values. Components reference `var(--token)` in inline styles.

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `--ink` | `#f0f4f8` | `#0e1014` | Page background |
| `--card` | `#ffffff` | `#14181f` | Card surfaces |
| `--surface-deep` | `#f8fafc` | `#0f1218` | Inset cards (InsightCard, SparkCard) |
| `--line` | `#e2e8f0` | `#232932` | All borders |
| `--text` | `#0e1014` | `#e8eaed` | Primary text |
| `--mute` | `#64748b` | `#8a93a0` | Secondary text |
| `--dim` | `#94a3b8` | `#5e6772` | Tertiary / attribution text |
| `--arrowBlue` | `#2563eb` | `#6db4ff` | Navigation arrow, distance pill |
| `--hero-grad` | light gray gradient | dark blue gradient | Hero card background |
| `--cat-inactive` | `#f1f5f9` | `#1a1f28` | Places category inactive button |
| `--shimmer-peak` | `#e2e8f0` | `#1e2530` | Skeleton shimmer midpoint |
| `--open-fg` / `--closed-fg` / `--warn-fg` | `#15803d` / `#b91c1c` / `#b45309` | `#6dd49a` / `#fda4a4` / `#fbbf24` | Places open/closed pill and amber chip text |

Tailwind components use `dark:` prefixed classes (e.g. `bg-white dark:bg-gray-800`). Do NOT hardcode hex values in inline styles — always use the CSS variable.

**Responsive Design**:
- Grid layout adapts to screen size
- Components use Tailwind responsive prefixes
- Mobile-first approach with desktop enhancements

## Key Development Patterns

### Tabbed Navigation
- React state-driven tab switching with activeTab state
- Component lazy loading - only active tab renders
- Touch-optimized tab buttons with visual feedback
- Persistent header across all tabs for unified experience

### Enhanced Weather Features
- **Option B hero**: a Driving insight card from `deriveDriving` (a pure function of current conditions: wet roads, visibility, wind, plus estimated highway range loss below 70°F); no extra API calls. The "What to Expect" card was removed in Aug 2026
- **12-hour sparkline**: SVG path built from `buildHourlyTemps()` which linearly interpolates between OWM 3-hour intervals; `linearGradient` fill + labeled markers every 3rd point
- **Weather icons**: `react-icons/wi` (Erik Flowers Weather Icons) — SVG components, no CDN dependency. Mapped via `OWM_TO_WI` lookup in `Weather.jsx` (18 OWM codes → WI component + hex color). `WeatherIcon` takes `size` as px or any CSS length; hero and forecast rows pass viewport-scaled `clamp()` values. Each condition has a tuned color (e.g. `WiDaySunny` → `#FFB800`, `WiDayRain` → `#4A88C0`). Add new mappings to `OWM_TO_WI`; fallback is `WiDaySunny`.
- Hero temperature: Inter 200, `clamp(64px, calc(30vh - 102px), 168px)`; `marginTop: auto` anchors temp block above insight content
- **Tesla viewport sizing**: the in-car browser is ~773×601 CSS px (Weather content area ~739×409). Across all tabs, font `clamp()` minimums keep the smallest text ≥11px there; verify at 773×601 and 1180×919 with no hero/forecast overflow after layout changes
- 5-day and hourly forecasts from OpenWeather `/forecast` endpoint (3-hour intervals, 5-day window), fetched via `/api/weather`

### Places Integration
- **Data sources**: `/api/places` (server-side Geoapify Places + OSRM `/table` ETA) + Wikidata P154 from the browser (brand logo, 30-day localStorage cache)
- **Category definitions**: radius + Geoapify category keys live in `src/shared/placeCategories.js` (shared with the function); labels/icons in `CATEGORY_UI` in `Places.jsx`
- **6 EV-specific categories**: Food, Charging, Hotels, Shopping, Fun, Services (Gas removed — Tesla app)
- **Per-category search radius**: 4–16 km tuned to POI density (Charging = 16 km, Food = 5 km)
- **10-minute query cache** keyed by `lat,lon,category`; in-flight dedup prevents double requests
- **opening_hours.js** parses `opening_hours` OSM tag — renders open/closed pill only when tag exists and parses cleanly
- **Place normalizer**: strips unnamed POIs, `disused:*`/`abandoned:*`/`fixme=*` entries, confirmed-closed places; sorts ascending by distance; caps at 5
- **2×3 grid layout**: first card spans 2 rows (featured); brand panel with hash-derived gradient + 2-letter monogram (swaps to Wikidata logo when available) flexes to the height the card body leaves; distance+ETA pill and open/closed pill sit in the card body (small cards show just Open/Closed, featured adds hours); on short viewports (`max-height: 760px`) small cards hide chips and brand mark so the panel becomes a colour band; attribute chips (`yes`/`designated` → accent, `limited` → amber, `no` → omit)
- **Brand logo rendering**: Wikidata logos render inside a white rounded tile (no CSS filter) — this handles both transparent-background SVGs and opaque-background JPEGs (e.g. Dunkin') correctly; monogram fallback used when no `brand:wikidata` tag exists in OSM or Wikidata has no P154 claim
- **Addresses**: every card shows `house number + street, city`; multi-number values (`679;681;697`) render as a range, and Geoapify's fallback street (the place's own name) is hidden
- **Charging details** (`src/shared/charging.js`, shared with the function): plug types (Tesla/NACS, CCS, CHAdeMO, J1772, Type 2), max kW, stalls on the type line, plus Free / Customers only / network chips. Chargers sort Tesla plug → CCS → unknown → other plugs, then by distance. Unnamed chargers are named from brand/network/operator server-side. The function keeps `socket:<type>` and `socket:<type>:output` tags only
- **Hotels**: `stars` and `rooms` chips when OSM has them
- **Whole card is the tap target** — opens Google Maps at place coordinates; navigate arrow in body row is decorative only
- `Powered by Geoapify · © OpenStreetMap contributors · ODbL` attribution required (Geoapify free plan + ODbL) and rendered

### Location Management
- Startup order: GPS (10 s timeout, `GPS_OPTIONS`) → last location saved in localStorage (`src/shared/savedLocation.js`, key `tesla.lastLocation.v1`, written on every GPS fix or zip search) → Boston default. The Tesla browser often blocks GPS, so the saved location is what usually applies in the car
- Zip code search with OpenWeather geocoding (header button labelled "Change location", map-pin icon; it sets the location, it does not search the site)
- Context provides unified location state across components
- Real-time location updates for Places component

### Error Handling
- API error states with user-friendly messages
- Retry functionality for failed requests
- Loading states with spinners and skeleton screens
- Graceful degradation for offline scenarios

### Performance Optimization
- useMemo for expensive calculations (categories, forecast data)
- useCallback for event handlers to prevent re-renders
- Component-level caching for API responses
- Efficient scroll event handling with requestAnimationFrame

### Tesla Integration Considerations
- Originally designed for Tesla vehicle browsers
- Currently limited by Tesla's geolocation API restrictions
- Optimized for in-vehicle use case (large fonts, simple navigation)

## Dependencies & Versions

**Core Dependencies**:
- React 18.3.1 (hooks-based with useCallback/useMemo optimization)
- Tailwind CSS 3.4.x (structural layout; design-specific tokens use inline styles). DaisyUI was removed — its v5 never worked on Tailwind 3, so do not re-add it
- React Icons 5.5.0 — Feather (`react-icons/fi`) for UI icons; `react-icons/bi` for BiCurrentLocation; **Weather Icons (`react-icons/wi`)** for all weather condition icons in Weather.jsx
- opening_hours 3.15 (OSM opening_hours tag parser — used in Places)
- DOMPurify 3.4.x (URL sanitization in News thumbnails)
- Moment.js 2.31 (date formatting for weather eyebrow)
- fast-xml-parser 5.x (RSS/Atom parsing in the news function)

**Design token approach**: Weather and Places components reference CSS custom properties via a `C` object at the top of each file (e.g. `C.ink = "var(--ink)"`). The actual values are defined in `src/index.css` and switch automatically with the `.dark` class. Do not hardcode hex values in inline styles.

**Build Tools**:
- Vite 7.3.x (replaces CRA; `npm start` = `vite`, `npm run build` = `vite build`)
- PostCSS + Autoprefixer (CSS processing)

## Testing & Quality

- Vitest 4 — `tests/unit/functions/api.test.mjs` covers routing, validation, caching headers, key-leak safety, RSS parsing, thumbnail URL rewriting, Geoapify mapping (incl. charger tags) and TomTom incidents/drive times (fetch is mocked); `tests/unit/shared/charging.test.js` covers charger plug/kW/stall parsing and ranking
- **Dev double-requests**: `src/index.js` wraps the app in React StrictMode, so effects run twice in `npm start`/Vite dev; production makes one request per fetch
- Manual testing recommended for API integrations (Geoapify, OWM, OSRM, Wikidata, RSS feeds)
- Playwright MCP available in Claude Code sessions for browser screenshot verification

## Deployment

**Live Demo**: https://teslaweather.netlify.app/
**Recommended Platform**: Netlify (auto-deploy from git)
**Build Output**: Static files in `build/` directory
**Functions**: `netlify/functions/` (esbuild bundler, see `netlify.toml`)
**Environment Variables**: `OPENWEATHER_API_KEY`, `GEOAPIFY_API_KEY`, `TOMTOM_API_KEY` in Netlify (Functions scope, secret, all contexts)
**CI**: `.github/workflows/ci.yml` (lint, `npm test`, build; Node 24) on push to `main` and PRs; doesn't gate the Netlify deploy. `.github/dependabot.yml`: monthly npm (patch/minor grouped, majors separate) + weekly github-actions
**Docs**: `README.md` follows the readme-standard layout (Mermaid diagrams, validated with mermaid-cli) and describes the system as it is now; shipped work and design history go in `CHANGELOG.md`

## Common Development Tasks

### Adding New Tabs
1. Create new component in `src/components/`
2. Add tab configuration to `tabs` array in `App.js`
3. Import appropriate React Icon
4. Ensure component handles full-height layout
5. Test tab switching and active state styling

### Enhancing Touch Interactions
1. Implement drag scrolling with mouse/touch event handlers
2. Add visual feedback for touch states (hover, active)
3. Ensure minimum touch target sizes (44px+)
4. Test on actual touch devices and Tesla browsers
5. Consider gesture conflicts with browser navigation

### Adding New API Integrations
1. Add environment variables to `.env` and `.env.example`
2. Create API functions in component or context
3. Implement error handling and loading states
4. Add to smart fallback system if applicable
5. Add refresh/retry functionality with user feedback

### Modifying Weather Features
- Edit `src/components/Weather.jsx` for forecast changes
- Adjust scroll container configurations for new data types
- Update forecast data processing in TeslaAppContext
- Test drag interactions on multiple device types

### Places Component Updates
- Add/remove categories in `src/shared/placeCategories.js` (`id`, `radius` in metres, `geoapify` = Geoapify category keys — an invalid key makes Geoapify return 400) and add the label/icon to `CATEGORY_UI` in `Places.jsx`
- Adjust `radius` per category to tune POI density (sparse types like Charging need larger radii)
- Add new attribute chips in the `CHIP_DEFS` array (`tag` = OSM key, `label` = display string)
- The query cache is module-level (`queryCache` Map); invalidated by the refresh button or cleared on app reload
- Do not re-add Gas (`amenity=fuel`) — this is an EV-only app

### Updating Styling
- Follow existing Tailwind patterns with `dark:` variants for every color class
- For inline styles, always use `var(--token)` — never hardcode hex values
- To add a new color token: add it to both `:root` (light) and `.dark` blocks in `src/index.css`
- Test both light and dark modes after any styling change
- Test tabbed navigation on multiple screen sizes
- Ensure touch target accessibility standards