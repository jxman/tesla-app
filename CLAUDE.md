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
- **Enhanced Weather**: Option B hero — insight cards (What to Expect, Driving) derived from live forecast data + 12-hour temperature sparkline; OWM weather icons; 10-day forecast
- **Real Places Integration**: OpenStreetMap Overpass + OSRM — 2×3 image-grid layout (featured card spans 2 rows), 6 EV-specific categories (no Gas), opening hours parsing, brand panel with Wikidata logo lookup, attribute chips, OSM attribution
- **Live News Feed**: Categorized content (Headlines, Tech, Business, Science) with headline rows and DOMPurify-sanitized thumbnails
- **Traffic Conditions**: Waze iframe integration clipping vendor chrome
- **Touch-Optimized**: 64 px chip/tab targets, whole-card tap targets on Places, Tesla browser compatible
- **Tesla-themed UI**: Dark ink theme (`#0e1014` background) with Inter + JetBrains Mono typography

## Development Commands

### Build Tool: Vite
This project uses **Vite** for fast development and optimized production builds. Migrated from Create React App to resolve security vulnerabilities and improve performance.

### Essential Commands
- **Start development server**: `npm start` or `npm run dev` (runs on port 3000)
- **Build for production**: `npm run build` (output: `build/`)
- **Preview production build**: `npm run preview` (runs on port 4173)
- **Run tests**: `npm test` (Vitest)

### Development Testing Protocol
**For Claude Code development assistance:**
- **User's server**: Always runs on port 3000 (`http://localhost:3000`)
- **Testing changes**: Use port 3002 to avoid conflicts (`PORT=3002 npm start`)
- **Always test compilation** before asking user to verify changes

### Environment Variables (Vite)
- **Prefix**: All environment variables must use `VITE_` prefix
- **Access**: Use `import.meta.env.VITE_VARIABLE_NAME` (not `process.env`)
- **Example**: `import.meta.env.VITE_API_KEY`

### Performance Improvements from Vite Migration
- **Dev server startup**: ~20-30s → ~150ms (100x+ faster)
- **Hot Module Replacement**: ~1-3s → <500ms (5x+ faster)
- **Production build size**: 5.6MB → 2.5MB (55% reduction)
- **Production build time**: ~30s → ~1s (30x faster)
- **Security**: Resolved webpack-dev-server CVE-2025-30360

### No Linting/Type Checking
This project uses standard setup without additional linting or TypeScript. Code style is enforced through consistent patterns rather than automated tools.

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
│   └── TeslaAppContext.js     # Global state with forecast data
├── components/
│   ├── LocationSelector.jsx   # Header with search and branding
│   ├── Weather.jsx           # Enhanced weather with forecasts & drag scroll
│   ├── Traffic.jsx           # Waze traffic embed
│   ├── News.jsx             # News feed with categories
│   └── Places.jsx           # OpenStreetMap places integration
└── shared/
    └── Spinner.jsx          # Loading component
```

### Layout Architecture
The app uses a modern tabbed interface:
- **Navigation**: 4 tabs (Weather, Traffic, News, Places) with icons and active states
- **Single Content Area**: Full-height viewport optimization with calc(100vh - 200px)
- **Active Tab Display**: One component visible at a time, optimized for touch interaction
- **Header**: LocationSelector with Tesla branding and search (persistent across tabs)

### API Integration Patterns

**Weather API (OpenWeather)**:
- Context manages API calls and caching
- Handles both GPS coordinates and zip code geocoding
- Error states for API failures and invalid keys
- Automatic retry functionality

**News API**:
- Component-level state management
- Category-based filtering (general, technology, business, science)
- Local caching with refresh timestamps
- Comprehensive error handling for API limits

**Traffic Integration**:
- Embedded Waze iframe using current coordinates
- Updates automatically when location changes

## Environment Configuration

Required environment variables in `.env` (using **VITE_** prefix):
```env
# OpenWeather API
VITE_API_URL=https://api.openweathermap.org/data/2.5
VITE_API_KEY=your_openweather_api_key

# News API
VITE_NEWS_API_KEY=your_news_api_key
VITE_NEWS_API_URL=https://newsapi.org/v2

# Default location (Boston coordinates)
VITE_DEFAULT_LAT=42.364506
VITE_DEFAULT_LON=-71.038887
```

**Important**: Vite requires the `VITE_` prefix for all environment variables. Access them in code using `import.meta.env.VITE_VARIABLE_NAME`.

## Styling Architecture

**CSS Framework**: Tailwind CSS + DaisyUI for structural layout; inline styles for design tokens
**Theme**: Dark ink theme — token reference:
| Token | Value | Usage |
|---|---|---|
| ink | `#0e1014` | Page background |
| card | `#14181f` | Card surfaces |
| line | `#232932` | All borders |
| text | `#e8eaed` | Primary text |
| mute | `#8a93a0` | Secondary text |
| accent | `#4d7cff` | Brand action, sparkline |
| good | `#22c55e` | Live pill, open status |

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
- **Option B hero**: insight cards (What to Expect + Driving) derived from live OWM forecast; `deriveWhatToExpect` and `deriveDriving` are pure functions operating on `forecastData.list` (3-hour intervals); no new API calls
- **12-hour sparkline**: SVG path built from `buildHourlyTemps()` which linearly interpolates between OWM 3-hour intervals; `linearGradient` fill + labeled markers every 3rd point
- **OWM weather icons**: `https://openweathermap.org/img/wn/{icon}@2x.png` used in hero header and 5-day forecast cards
- Hero temperature: Inter 200 / 168 px; `marginTop: auto` anchors temp block above insight content
- 5-day and hourly forecasts from OpenWeather `/forecast` endpoint (3-hour intervals, 5-day window)

### Places Integration
- **Data sources**: Overpass API (place discovery) + OSRM `/table` batch call (ETA) + Wikidata P154 (brand logo, 30-day localStorage cache)
- **6 EV-specific categories**: Food, Charging, Hotels, Shopping, Fun, Services (Gas removed — Tesla app)
- **Per-category search radius**: 2–16 km tuned to POI density (Charging = 16 km, Food = 2 km)
- **10-minute query cache** keyed by `lat,lon,category`; in-flight dedup prevents double requests
- **opening_hours.js** parses `opening_hours` OSM tag — renders open/closed pill only when tag exists and parses cleanly
- **Place normalizer**: strips unnamed POIs, `disused:*`/`abandoned:*`/`fixme=*` entries, confirmed-closed places; sorts ascending by distance; caps at 5
- **2×3 grid layout**: first card spans 2 rows (featured); brand panel with hash-derived gradient + 2-letter monogram (swaps to Wikidata logo when available); open/closed pill top-left, distance+ETA pill top-right; attribute chips (`yes`/`designated` → accent, `limited` → amber, `no` → omit)
- **Whole card is the tap target** — opens Google Maps at place coordinates; navigate arrow in body row is decorative only
- `© OpenStreetMap contributors · ODbL` attribution required and rendered

### Location Management
- GPS location detection with fallback to default (Boston)
- Zip code search with OpenWeather geocoding
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
- Tailwind CSS 3.4.17 + DaisyUI 4.12.24 (structural layout; design-specific tokens use inline styles)
- React Icons 5.5.0 — Feather (`react-icons/fi`) used throughout; `react-icons/bi` for BiCurrentLocation
- opening_hours 3.12.0 (OSM opening_hours tag parser — used in Places)
- DOMPurify 3.4.0 (URL sanitization in News thumbnails)
- Moment.js 2.29.1 (date formatting for weather eyebrow)

**Design token approach**: Weather and Places components use inline style objects keyed to a `C` / token constant at the top of each file (e.g. `--ink: #0e1014`, `--card: #14181f`, `--line: #232932`). Do not use Tailwind for these — the values are too specific.

**Build Tools**:
- Vite 7.3.2 (replaces CRA; `npm start` = `vite`, `npm run build` = `vite build`)
- PostCSS + Autoprefixer (CSS processing)

## Testing & Quality

- Uses Vitest (migrated from Jest with CRA)
- No additional testing configuration
- Manual testing recommended for API integrations (Overpass, OWM, OSRM, Wikidata)
- Playwright MCP available in Claude Code sessions for browser screenshot verification

## Deployment

**Live Demo**: https://teslaweather.netlify.app/
**Recommended Platform**: Netlify (auto-deploy from git)
**Build Output**: Static files in `build/` directory
**Environment Variables**: Configure in deployment platform dashboard

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
- Add/remove categories in the `CATEGORIES` array at the top of `Places.jsx` — each entry has `id`, `label`, `Icon`, `radius` (metres), and `filters` (array of `{key, rx}` Overpass tag filters)
- Adjust `radius` per category to tune POI density (sparse types like Charging need larger radii)
- Add new attribute chips in the `CHIP_DEFS` array (`tag` = OSM key, `label` = display string)
- The query cache is module-level (`queryCache` Map); invalidated by the refresh button or cleared on app reload
- Do not re-add Gas (`amenity=fuel`) — this is an EV-only app

### Updating Styling
- Follow existing Tailwind + DaisyUI patterns
- Maintain Tesla theme colors and dark mode
- Test tabbed navigation on multiple screen sizes
- Ensure touch target accessibility standards