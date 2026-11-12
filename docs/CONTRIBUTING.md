# Contributing to Tesla Dashboard

Thank you for considering contributing to the Tesla Dashboard project! 🚗⚡

This project now features a modern tabbed interface with enhanced weather forecasts, real places integration, and touch-optimized design.

## How to Contribute

### Reporting Issues
- Use GitHub Issues for bug reports and feature requests
- Include detailed steps to reproduce the issue
- Add screenshots or screen recordings when helpful
- Specify browser, device, and Tesla vehicle model if applicable

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/tesla-app.git`
3. Install dependencies: `npm install`
4. Copy environment template: `cp .env.example .env`
5. Add your API keys to `.env` (OpenWeather, Geoapify, TomTom; see the README's [Infrastructure and configuration](../README.md#infrastructure-and-configuration))
6. Install the Netlify CLI (`npm install -g netlify-cli`) and start the dev server: `npm start` (app + `/api` on port 3000)
7. For commit hooks: `brew install ggshield` and `ggshield auth login`

### Making Changes
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Follow existing code style and conventions (React hooks, Tailwind CSS)
3. Test your changes thoroughly on multiple devices
4. Test touch interactions for Tesla compatibility
5. Update documentation if needed
6. Ensure lint, tests and the build pass: `npm run lint`, `npm test`, `npm run build`
7. Test tabbed navigation and component switching

### Pull Request Process
1. Update README.md if you've added features
2. Make sure all tests pass (`npm test`) and use Conventional Commit messages (`feat:`, `fix:`, …), which the commit hook enforces
3. Create pull request with clear description
4. Link any related issues

## Code Style Guidelines
- Use React hooks and functional components (no class components)
- Follow existing Tailwind CSS patterns
- Implement useMemo/useCallback for performance optimization
- Add comments for complex logic, especially in drag/touch handlers
- Use descriptive variable and function names
- Keep components focused and reusable
- Ensure all useEffect hooks have proper dependencies
- Follow Tesla-optimized design patterns (large touch targets, readable fonts)

## Testing
- Test on multiple browsers (Chrome, Safari, Firefox)
- Verify mobile and Tesla browser compatibility
- Test touch interactions and drag scrolling
- Test with and without location permissions
- Validate API error handling for all routes (Weather, News, Places, Traffic)
- Test tabbed navigation switching
- Verify forecast scrolling works on touch devices
- Test with slow/intermittent network connections

## API Key Security
- Never commit API keys; the `ggshield` pre-commit hook blocks commits containing secrets
- Keys live only in the Netlify Function (`process.env`); never give a secret a `VITE_` prefix, because Vite builds those into the public bundle
- Test with invalid/expired keys to ensure errors are generic and never include upstream URLs (which contain keys)

## Development Commands

### Essential Commands
- **Development server**: `npm start` (`netlify dev`, port 3000, includes `/api`)
- **Second test server**: `netlify dev --port 3005 --target-port 5175 --command "npx vite --port 5175 --strictPort"`
- **Production build**: `npm run build`
- **Unit tests**: `npm test` (Vitest)
- **Lint**: `npm run lint`

### Architecture Notes
- **Tabbed Interface**: Single-tab navigation in App.js with state management
- **Weather Component**: Enhanced with hourly/daily forecasts and drag scrolling
- **API layer**: one Netlify Function (`netlify/functions/api.mjs`) proxies every third-party service
- **Places Component**: Geoapify Places (OpenStreetMap data) via `/api/places`
- **Context**: TeslaAppContext manages location, weather, and forecast data

### Component Guidelines
- Weather: Focus on forecast accuracy and touch interactions
- Places: Ensure offline graceful degradation and location accuracy
- Traffic: drive times and incidents via TomTom; keep refreshes paused while the page is hidden
- News: Keep categorized feed with refresh functionality

## Questions?
Open a GitHub Discussion or create an issue for any questions about contributing.

## Related Documentation
- `PLACES_API_GUIDE.md` - Historical Places API comparison (superseded by Geoapify)
- `../CHANGELOG.md` - Shipped work and design history
- `CLAUDE.md` - Project-specific development guidelines
- `README.md` - Complete project overview and setup