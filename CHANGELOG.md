# Changelog

Shipped work for the Tesla Dashboard, oldest first. For how the system works today, see the [README](README.md).

## Shipped features and fixes

### 2022: first version

- Create React App dashboard with Weather, Traffic (Waze iframe) and News sections
- Default location of Boston, used because the Tesla browser restricts geolocation and as a fallback for browsers without it
- React Context for location and weather state; location/zip-code navbar

### 2025: tabbed redesign and Vite

- Refreshed UI, working zip-code search, and a functional News section (NewsAPI at the time)
- Tabbed interface (Weather, Traffic, News, Places) with hourly and daily forecasts
- DaisyUI experiments for button and tab styling (DaisyUI was later removed, see 2026)
- Migrated from Create React App to Vite: dev server start ~20–30 s → ~150 ms, production build 5.6 MB → 2.5 MB, and resolved the webpack-dev-server CVE-2025-30360
- Fixed a DOM-based XSS in News (CWE-79) and added URL validation with DOMPurify (see [docs/SECURITY.md](docs/SECURITY.md))

### 2026 H1: Tesla glanceability

- Redesigned for in-car glanceability: Option B weather hero, Inter + JetBrains Mono typography
- Rebuilt Places: OpenStreetMap (Overpass) + OSRM, 2×3 grid with a featured card, opening hours, brand panels with Wikidata logos; removed Gas (EV-only app)
- Light/dark mode with a sun/moon toggle and CSS-variable theme tokens
- Weather icons switched to `react-icons/wi` with per-condition colours
- Brand logos rendered on a white tile instead of a CSS invert filter
- Added `netlify.toml` with build settings and the SPA redirect
- Dependency security fixes: glob, minimatch, rollup, dompurify, picomatch, brace-expansion, yaml, vite, postcss

### 2026 H2: Tesla viewport and tooling

- Fixed the Weather hero collapsing in the Tesla browser after a devicePixelRatio change; tightened and rebalanced the Weather layout; dropped the "What to Expect" insight card
- Larger fonts across all tabs, tuned for the ~773×601 Tesla viewport
- Places fell back across Overpass API mirrors (later replaced, see below)
- Pre-commit hooks: ESLint via lint-staged, merge-conflict check, secret scanning and commitlint; gitleaks replaced by GitGuardian `ggshield`
- Removed the inactive DaisyUI plugin; resolved Dependabot and Snyk alerts

### 2026-11-11: server-side API layer

- **Netlify Function + CDN:** every third-party call moved into one function (`/api/*`), so API keys are Netlify secrets and responses are cached at the edge. Previously the OpenWeather key was built into the public JavaScript bundle
- **News:** replaced NewsAPI with free-to-read RSS feeds merged server-side; added Sports and Entertainment; dropped paywalled sources (NYT)
- **Places:** switched from Overpass to Geoapify Places, which serves the same OpenStreetMap data (see [Design history](#places-overpass-to-geoapify))
- **Traffic card:** live drive times to saved places and nearby incidents (TomTom); the Waze map embed was removed so the card fills the tab
- **Places details:** street address on every card; charger plug types, max kW, stall count, fee and access; Tesla-compatible chargers listed first; unnamed chargers named from brand or network; hotel stars and room count
- **Header:** the search icon became a "Change location" button, since it sets the location rather than searching
- Vitest unit tests for the function routes

### 2026-11-11: car-friendly refinements

- **Remembered location:** the last zip code or GPS fix is saved in the browser and used at startup when GPS is unavailable, instead of falling back to Boston every time; GPS requests time out after 10 s
- **Food radius** raised from 2 km to 5 km (Food found nothing around smaller town centres)
- **Traffic refresh pauses** while the page is hidden or the screen is off, and refreshes on return if the data is stale; saves TomTom quota
- **Nearest charger on the Traffic tab:** the closest Tesla (or CCS) charger with distance, drive time and speed, one tap to directions
- **Smaller News thumbnails:** NPR, Variety, Deadline and CBS Sports images are requested at 240 px wide (0.2–1.8 MB → 11–27 KB each); thumbnails lazy-load
- GitHub Actions CI: lint, unit tests and build on every push and pull request
- Dependabot version updates: one monthly PR for npm patch/minor updates, separate PRs for major upgrades; removed the outdated `scripts/update-dependencies.sh`, which pinned old versions
- **Add-place form above the keyboard:** the Traffic tab's Add a place form is a panel pinned to the top of the screen, since the Tesla on-screen keyboard covers the bottom ~45% without resizing the page
- **Auto light/dark mode:** switches at sunrise and sunset for the current location, like the car's Auto display; the sun/moon button overrides until the next sunrise or sunset
- **Removed the nearest-charger row** from the Traffic tab: the car's own navigation already finds chargers, and the row crowded out saved places (chargers are still on the Places tab)
- **Drive-time tiles:** saved places show as a 2×2 grid (up to 4, down from 5) that fits the Tesla screen without scrolling; the free slot is an Add place tile, minutes are coloured by delay, and tapping a tile opens directions
- **Directions from your location:** tapping a Places card or a drive-time tile opens Google Maps driving directions starting at the app's current location (Places previously opened only the pin)
- **5-day forecast labels:** rows are labelled by date at the forecast location instead of by position; late in the evening OpenWeather has no slots left for today, so tomorrow was shown as "Today" and appeared to be missing
- **Light-mode active tab:** dark pill with white text (it was white on white)
- **Thin, theme-coloured scrollbars** everywhere (dark mode showed a bright white scrollbar)
- Patch updates (commitlint, Vite 7.3.8, PostCSS, Autoprefixer, globals, user-event) and a `minimatch` advisory fix in ESLint's dependencies

## Design history

### Places: Overpass to Geoapify

The browser-side Overpass API began returning 406 and timing out for browser requests in 2026, and later failed from Netlify's servers too. Geoapify Places serves the same OpenStreetMap data (raw tags in `datasource.raw`), so the card logic, opening hours and chips carried over unchanged. The full investigation is in [docs/PLACES_OVERPASS_406_ISSUE.md](docs/PLACES_OVERPASS_406_ISSUE.md).

### One function instead of one per route

Netlify's Free and Starter plans allow only two code-based rate-limit rules per site. A single function at `/api/*` lets one rule (120 requests per 60 s per IP) cover every route.

### Deploy targets removed from the docs

Earlier READMEs described deploying to Vercel or GitHub Pages. Since the `/api/*` routes are Netlify Functions, those targets no longer work without a rewrite, so the docs now cover Netlify only.
