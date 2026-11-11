# 🚗 Tesla Dashboard - React Web App

A modern React-based dashboard with tabbed navigation designed for Tesla vehicle browsers, providing location-based weather with hourly/daily forecasts, traffic conditions, news updates, and nearby points of interest. Features a sleek single-tab interface optimized for touch interaction.

🌐 **[Live Demo](https://teslaweather.netlify.app/)** | 📱 Mobile Friendly | ⚡ Tesla Optimized

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-blue.svg)](https://tailwindcss.com/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/ed22f193-b096-456c-b646-b7812700afb1/deploy-status)](https://app.netlify.com/projects/teslaweather/deploys)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Features

### ✅ Currently Working
- **🌤️ Enhanced Weather** - 12-hour and 10-day forecasts with horizontal scrolling, drag/touch support
- **📰 Live News Feed** - Categorized news (Headlines, Tech, Business, Science, Sports, Entertainment) from free-to-read RSS feeds, with refresh  
- **🚗 Traffic Conditions** - Live drive times (with arrival times) to your saved places, plus traffic incidents near you (TomTom)
- **🗺️ Places Integration** - Nearby places in 6 EV-focused categories (OpenStreetMap data via Geoapify) with addresses, open/closed status and drive times; chargers show plug types, kW, stalls and fees, Tesla-compatible first
- **📱 Tabbed Interface** - Single-tab navigation optimized for Tesla touchscreens
- **📍 Location Services** - GPS location detection with zip code fallback search
- **🎨 Tesla-themed UI** - Dark theme with Tesla-inspired design elements
- **👆 Touch Optimized** - Drag scrolling, large touch targets, mobile-first design

### 🚧 In Development
- **🍽️ Premium Places** - Google Places API integration for enhanced data (ratings, hours, photos)
- **⚡ Tesla Supercharger Locations** - Real-time charging station data
- **🔋 EV-Optimized Routes** - Range-aware navigation planning
- **🔄 Background Updates** - Auto-refresh for weather and places data

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- API keys (see Configuration section)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tesla-app.git
   cd tesla-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Add your OpenWeather key to `.env` (see Configuration below)

4. **Start development server** (needs the Netlify CLI: `npm install -g netlify-cli`)
   ```bash
   npm start          # netlify dev: app + /api functions on http://localhost:3000
   npm run dev:vite   # Vite only, no /api (weather, news and places won't load)
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

API keys never reach the browser. The React app calls its own `/api/*` endpoints
(one Netlify Function, `netlify/functions/api.mjs`). The function holds the keys,
calls the third-party APIs server-side, and the Netlify CDN caches its responses.

| Endpoint | Upstream | CDN cache |
|---|---|---|
| `/api/weather?lat&lon` | OpenWeather current + forecast | 10 min |
| `/api/geocode?zip` | OpenWeather zip geocoding | 30 days |
| `/api/news?category` | Free-to-read RSS feeds for Headlines, Tech, Business, Science, Sports and Entertainment (NPR, PBS NewsHour, The Guardian, BBC, Ars Technica, Engadget, CNBC, Phys.org, ScienceDaily, CBS Sports, Yahoo Sports, Variety, Deadline) | 15 min |
| `/api/places?lat&lon&cat` | Geoapify Places (OpenStreetMap data) + OSRM drive times | 10 min |
| `/api/incidents?lat&lon` | TomTom Traffic Incidents (~10 mi around you) | 2 min |
| `/api/drive-times?lat&lon&to` | TomTom Routing with live traffic, to up to 5 saved places | 2 min |
| `/api/search?text` | Geoapify address autocomplete (adding saved places) | 1 day |

### Environment variables

| Variable | Where | Secret | Purpose |
|---|---|---|---|
| `OPENWEATHER_API_KEY` | Netlify (Functions scope, all deploy contexts) + local `.env` | Yes | OpenWeather API key |
| `GEOAPIFY_API_KEY` | Netlify (Functions scope, all deploy contexts) + local `.env` | Yes | Geoapify Places + address search key |
| `TOMTOM_API_KEY` | Netlify (Functions scope, all deploy contexts) + local `.env` | Yes | TomTom traffic incidents + routing key |
| `VITE_DEFAULT_LAT` / `VITE_DEFAULT_LON` | Build | No | Fallback location (Boston) when GPS is unavailable |

In Netlify, mark all three keys as **Contains secret values** and give them a value in every deploy context (draft and preview deploys use the Deploy Previews context). Netlify's
secrets scanning then fails any build that leaks it into `build/`. Never give a
secret a `VITE_` prefix: Vite builds every `VITE_*` variable into the public bundle.

News uses free RSS feeds and needs no key. Get an OpenWeather key at
[openweathermap.org/api](https://openweathermap.org/api) and a Geoapify key at
[geoapify.com](https://www.geoapify.com/) (free plan).

## 🛠️ Technologies Used

### Core Framework
- **React 18.3.1** - Modern React with hooks
- **React Context** - State management for location and weather data

### Styling & UI
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **React Icons 5.5.0** - Icon library with Tesla-appropriate icons

### APIs & Services
- **OpenWeather API** - Weather data and geocoding
- **RSS feeds** - News headlines (merged server-side)
- **Geoapify Places + OSRM** - Nearby places (OpenStreetMap data) and drive times
- **Netlify Functions + CDN** - Server-side API proxy with edge caching
- **TomTom** - Traffic incidents and live-traffic routing
- **Browser Geolocation** - GPS positioning

### Build & Development
- **Vite** - Build tooling and development server
- **Netlify CLI** - Local functions (`netlify dev`)
- **Vitest** - Unit tests for the API function (`npm test`)
- **PostCSS & Autoprefixer** - CSS processing
- **ESLint** - Code linting and formatting

## 📁 Project Structure

```
tesla-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── LocationSelector.jsx    # Location input and current location
│   │   ├── Weather.jsx             # Enhanced weather with forecasts
│   │   ├── Traffic.jsx             # Traffic tab (location guard)
│   │   ├── TrafficCard.jsx         # Drive times + traffic near me
│   │   ├── News.jsx                # News feed with categories
│   │   └── Places.jsx              # OpenStreetMap places integration
│   ├── context/
│   │   └── TeslaAppContext.js     # Global state management with forecast data
│   ├── shared/
│   │   └── Spinner.jsx            # Loading component
│   ├── assets/                    # Images and static files
│   ├── App.js                     # Tabbed interface main component
│   ├── index.js                   # App entry point
│   └── index.css                  # Global styles
├── .env.example                   # Environment variables template
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## 🎯 Tesla Integration

### Original Purpose
This app was designed as a homepage replacement for Tesla vehicle browsers, providing:
- Location-aware weather without Tesla's built-in limitations
- Real-time traffic conditions for trip planning
- News updates during charging stops
- Nearby amenities and points of interest

### Current Status
- **⚠️ Tesla Browser Limitation**: Tesla has restricted geolocation API access in vehicle browsers
- **✅ Works Perfectly**: On desktop, mobile, and tablet browsers
- **🔄 Future Ready**: Prepared for potential Tesla browser updates

### Usage in Tesla
1. Connect to Tesla's WiFi or use Premium Connectivity
2. Navigate to your deployed app URL
3. Allow location permissions (when/if Tesla re-enables)
4. Bookmark for easy access

## 🚀 Deployment

### 🌐 Live Demo
**Access the app now: [https://teslaweather.netlify.app/](https://teslaweather.netlify.app/)**

### Netlify (Recommended)
1. Build the project: `npm run build`
2. Deploy the `build` folder to Netlify
3. Set environment variables in Netlify dashboard
4. Custom domain optional

### Vercel
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard  
3. Auto-deploy on every commit

### GitHub Pages
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json: `"homepage": "https://yourusername.github.io/tesla-app"`
3. Deploy: `npm run build && npm run deploy`

## 🎨 Customization

### Tesla Theme Colors
The app uses Tesla-inspired colors defined in Tailwind config:
- **Tesla Red**: `#dc2626` - Primary brand color
- **Dark Gray**: `#1a1a1a` - Background
- **Light Gray**: `#9ca3af` - Secondary text

### Layout Modifications
Edit `src/App.js` to modify the tabbed interface:
```javascript
// Current layout: Single-tab interface with 4 tabs
const tabs = [
  { id: 'weather', name: 'Weather', icon: FiCloud, component: Weather },
  { id: 'traffic', name: 'Traffic', icon: FiNavigation, component: Traffic },
  { id: 'news', name: 'News', icon: FiRss, component: News },
  { id: 'places', name: 'Places', icon: FiMapPin, component: Places }
];
```

## 🔮 Roadmap

### Short Term (Next Release)
- [ ] Google Places API integration for premium place data
- [ ] Background auto-refresh for weather and places
- [ ] Enhanced Tesla Supercharger location finder
- [ ] Save favorite locations and preferences

### Medium Term
- [ ] Tesla vehicle API integration (if available)
- [ ] Route planning with charging stops
- [ ] Saved locations and preferences
- [ ] Weather-aware range calculations

### Long Term
- [ ] Tesla owner community features
- [ ] Integration with Tesla's in-car systems
- [ ] Voice control compatibility
- [ ] Offline mode support

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and structure
- Add comments for complex logic
- Test on multiple devices and browsers
- Update README if adding new features
- Ensure build passes without warnings

## 🔧 Troubleshooting

### Common Issues

**Location not working:**
- Check browser permissions for location access
- Verify GPS is enabled on device
- Try entering zip code manually

**Weather not loading:**
- Verify OpenWeather API key in .env file
- Check API key hasn't exceeded rate limits
- Ensure internet connection is stable

**News not updating:**
- News comes from public RSS feeds; if one feed is down the others still load
- Check if API key has reached daily limit
- Try refreshing the component

**Build warnings:**
- Run `npm run build` to see specific issues
- Most warnings are safe but should be addressed
- Check ESLint configuration if needed

## 📊 Performance

### Optimization Features
- **Smart Caching** - Weather and news data cached to reduce API calls
- **Lazy Loading** - Components load only when needed
- **Responsive Images** - Optimized for different screen sizes
- **Minimal Bundle** - Only necessary dependencies included

### Analytics
- Built bundle size: ~76KB (gzipped)
- Load time: <2 seconds on 3G
- Lighthouse score: 95+ (Performance, Accessibility, Best Practices)
- Touch-optimized for Tesla and mobile browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tesla** - For inspiring the automotive technology revolution
- **OpenWeather** - For reliable weather data APIs
- **NPR, PBS NewsHour, The Guardian, BBC, Ars Technica, Engadget, CNBC, Phys.org, ScienceDaily, CBS Sports, Yahoo Sports, Variety, Deadline** - Free-to-read RSS news feeds
- **React Community** - For excellent documentation and tools
- **Tailwind CSS** - For the utility-first CSS framework

## 📞 Support

- **Issues**: Please use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: [your-email@domain.com](mailto:your-email@domain.com) for direct contact

---

**⚡ Built with ❤️ for the Tesla community**

*Note: This is an unofficial project and is not affiliated with Tesla, Inc.*