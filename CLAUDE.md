# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesla Dashboard is a React-based web application designed as a homepage replacement for Tesla vehicle browsers. It provides location-based weather, traffic conditions, news updates, and nearby points of interest in a Tesla-themed interface.

**Key Features:**
- Real-time weather with GPS/zip code location support
- Live news feed with categorized content (Headlines, Tech, Business, Science)
- Traffic conditions via Waze integration
- Tesla-inspired dark theme UI
- Mobile-responsive design

## Development Commands

### Essential Commands
- **Start development server**: `npm start` (runs on port 3000)
- **Build for production**: `npm run build`
- **Run tests**: `npm test`
- **Eject (not recommended)**: `npm run eject`

### Development Testing Protocol
**For Claude Code development assistance:**
- **User's server**: Always runs on port 3000 (`http://localhost:3000`)
- **Testing changes**: Use port 3002 to avoid conflicts (`PORT=3002 BROWSER=none npm start`)
- **Always test compilation** before asking user to verify changes

### No Linting/Type Checking
This project uses standard Create React App setup without additional linting or TypeScript. Code style is enforced through consistent patterns rather than automated tools.

## Project Architecture

### State Management
The application uses React Context API for global state management:

- **TeslaAppContext** (`src/context/TeslaAppContext.js`): Central state manager handling:
  - Location coordinates (lat/long)
  - Weather data from OpenWeather API
  - Loading states and error handling
  - Location search functionality (GPS + zip code)

### Component Structure
```
src/
├── App.js                      # Main app layout with 2x2 grid
├── context/
│   └── TeslaAppContext.js     # Global state management
├── components/
│   ├── LocationSelector.jsx   # Header with search and branding
│   ├── Weather.jsx           # Weather display with refresh
│   ├── Traffic.jsx           # Waze traffic embed
│   ├── News.jsx             # News feed with categories
│   └── Yelp.jsx            # Places (placeholder, being updated)
└── shared/
    └── Spinner.jsx          # Loading component
```

### Layout Architecture
The app uses a responsive 2x2 grid layout:
- **Top Row**: Weather (1/3 width) + Traffic (2/3 width)
- **Bottom Row**: News (3/4 width) + Places (1/4 width)
- **Header**: LocationSelector with Tesla branding and search

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

Required environment variables in `.env`:
```env
# OpenWeather API
REACT_APP_API_URL=https://api.openweathermap.org/data/2.5
REACT_APP_API_KEY=your_openweather_api_key

# News API
REACT_APP_NEWS_API_KEY=your_news_api_key
REACT_APP_NEWS_API_URL=https://newsapi.org/v2

# Default location (Boston coordinates)
REACT_APP_DEFAULT_LAT=42.364506
REACT_APP_DEFAULT_LON=-71.038887
```

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

### Location Management
- GPS location detection with fallback to default (Boston)
- Zip code search with OpenWeather geocoding
- Context provides unified location state across components

### Error Handling
- API error states with user-friendly messages
- Retry functionality for failed requests
- Loading states with spinners and skeleton screens

### Data Refresh Patterns
- Weather: Manual refresh button with loading state
- News: Auto-refresh with timestamp display
- Context-managed refresh functions

### Tesla Integration Considerations
- Originally designed for Tesla vehicle browsers
- Currently limited by Tesla's geolocation API restrictions
- Optimized for in-vehicle use case (large fonts, simple navigation)

## Dependencies & Versions

**Core Dependencies**:
- React 18.3.1 (hooks-based, no class components)
- Tailwind CSS 3.4.17 + DaisyUI 4.12.24
- React Icons 5.5.0 (comprehensive icon set)
- Moment.js 2.29.1 (date formatting)

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

### Adding New API Integrations
1. Add environment variables to `.env` and `.env.example`
2. Create API functions in component or context
3. Implement error handling and loading states
4. Add refresh/retry functionality

### Modifying Layout
- Edit `src/App.js` for grid structure changes
- Adjust Tailwind classes for responsive behavior
- Consider Tesla vehicle screen dimensions

### Updating Styling
- Follow existing Tailwind + DaisyUI patterns
- Maintain Tesla theme colors and dark mode
- Test on multiple screen sizes and orientations