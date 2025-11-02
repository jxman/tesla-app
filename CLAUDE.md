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
- **Tabbed Navigation**: Single-tab interface with Weather, Traffic, News, and Places tabs
- **Enhanced Weather**: 12-hour and 10-day forecasts with horizontal scrolling and drag support
- **Real Places Integration**: OpenStreetMap-based nearby places with 7 Tesla-relevant categories
- **Live News Feed**: Categorized content (Headlines, Tech, Business, Science) with refresh
- **Traffic Conditions**: Waze integration for real-time traffic data
- **Touch-Optimized**: Drag scrolling, large touch targets, Tesla browser compatible
- **Tesla-themed UI**: Dark theme with Tesla-inspired design elements

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

**CSS Framework**: Tailwind CSS + DaisyUI components
**Theme**: Tesla-inspired dark theme with:
- Background: `bg-gray-900` (main), `bg-gray-800` (cards)
- Tesla Red accent: `#dc2626` (used in branding)
- Gray scale for text hierarchy
- Blue accents for interactive elements

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
- 12-hour forecast with horizontal scrolling
- 10-day forecast with extended weather patterns
- Drag/touch scrolling with mouse and touch event handlers
- Hourly/Daily toggle with animated transitions
- Forecast data from OpenWeather 5-day API

### Places Integration
- OpenStreetMap Overpass API for real place data
- 7 Tesla-relevant categories (Food, Gas, Charging, Hotels, Shopping, Fun, Services)
- Smart API fallback system (Google Places → Foursquare → OpenStreetMap)
- Touch-optimized horizontal scrolling place cards
- Distance calculations and Google Maps integration

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
- React 18.3.1 (hooks-based with useMemo/useCallback optimization)
- Tailwind CSS 3.4.17 + DaisyUI 4.12.24 (touch-optimized components)
- React Icons 5.5.0 (tab navigation icons: FiCloud, FiNavigation, FiRss, FiMapPin)
- Moment.js 2.29.1 (date formatting for forecasts and timestamps)

**Performance Features**:
- React.useMemo for category definitions and expensive calculations
- React.useCallback for event handlers and API calls
- Horizontal scrolling with native browser scroll optimization
- Component-level state management to minimize re-renders

**Build Tools**:
- Create React App 5.0.1 (webpack, babel, dev server)
- PostCSS + Autoprefixer (CSS processing)

## Testing & Quality

- Uses React Testing Library + Jest (standard CRA setup)
- No additional testing configuration
- Manual testing recommended for API integrations
- Focus on component rendering and user interactions

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
- Modify category queries in Places.jsx useMemo
- Update OpenStreetMap Overpass queries for new place types
- Test API fallback scenarios (OpenStreetMap → Google → Foursquare)
- Ensure proper error handling for location services

### Updating Styling
- Follow existing Tailwind + DaisyUI patterns
- Maintain Tesla theme colors and dark mode
- Test tabbed navigation on multiple screen sizes
- Ensure touch target accessibility standards