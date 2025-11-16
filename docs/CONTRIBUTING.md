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
5. Add your API keys to `.env` (see PLACES_API_GUIDE.md for Places setup)
6. Start development server: `npm start`
7. Test on port 3002 for development: `PORT=3002 BROWSER=none npm start`

### Making Changes
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Follow existing code style and conventions (React hooks, Tailwind CSS)
3. Test your changes thoroughly on multiple devices
4. Test touch interactions for Tesla compatibility
5. Update documentation if needed
6. Ensure build passes without ESLint warnings: `npm run build`
7. Test tabbed navigation and component switching

### Pull Request Process
1. Update README.md if you've added features
2. Make sure all tests pass
3. Create pull request with clear description
4. Link any related issues

## Code Style Guidelines
- Use React hooks and functional components (no class components)
- Follow existing Tailwind CSS + DaisyUI patterns
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
- Validate API error handling for all APIs (Weather, News, Places)
- Test tabbed navigation switching
- Verify forecast scrolling works on touch devices
- Test with slow/intermittent network connections

## API Key Security
- Never commit API keys to the repository
- Use environment variables for all sensitive data (.env files)
- Test with invalid/expired keys to ensure proper error handling
- Follow Places API setup guide for proper key restrictions
- Test the smart fallback system (Google Places → Foursquare → OpenStreetMap)

## Development Commands

### Essential Commands
- **Development server**: `npm start` (port 3000)
- **Testing server**: `PORT=3002 BROWSER=none npm start` (port 3002, no browser)
- **Production build**: `npm run build`
- **Test build**: `npm test`

### Architecture Notes
- **Tabbed Interface**: Single-tab navigation in App.js with state management
- **Weather Component**: Enhanced with hourly/daily forecasts and drag scrolling
- **Places Component**: OpenStreetMap integration with smart API fallback
- **Context**: TeslaAppContext manages location, weather, and forecast data

### Component Guidelines
- Weather: Focus on forecast accuracy and touch interactions
- Places: Ensure offline graceful degradation and location accuracy
- Traffic: Maintain Waze integration while considering alternatives
- News: Keep categorized feed with refresh functionality

## Questions?
Open a GitHub Discussion or create an issue for any questions about contributing.

## Related Documentation
- `PLACES_API_GUIDE.md` - Detailed Places API setup instructions
- `CLAUDE.md` - Project-specific development guidelines
- `README.md` - Complete project overview and setup