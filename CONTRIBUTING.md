# Contributing to Tesla Dashboard

Thank you for considering contributing to the Tesla Dashboard project! 🚗⚡

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
5. Add your API keys to `.env`
6. Start development server: `npm start`

### Making Changes
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Follow existing code style and conventions
3. Test your changes thoroughly
4. Update documentation if needed
5. Ensure build passes: `npm run build`

### Pull Request Process
1. Update README.md if you've added features
2. Make sure all tests pass
3. Create pull request with clear description
4. Link any related issues

## Code Style Guidelines
- Use React hooks and functional components
- Follow existing Tailwind CSS patterns
- Add comments for complex logic
- Use descriptive variable and function names
- Keep components focused and reusable

## Testing
- Test on multiple browsers (Chrome, Safari, Firefox)
- Verify mobile responsiveness
- Test with and without location permissions
- Validate API error handling

## API Key Security
- Never commit API keys to the repository
- Use environment variables for all sensitive data
- Test with invalid/expired keys to ensure proper error handling

## Questions?
Open a GitHub Discussion or create an issue for any questions about contributing.