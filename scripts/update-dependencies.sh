#!/bin/bash

echo "🚀 Starting Tesla App Dependency Updates..."

# Step 1: Safe updates first
echo "📦 Updating testing libraries and utilities..."
npm install @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.6.1 web-vitals@^5.0.1 react-icons@^5.5.0

# Step 2: React 18 update
echo "⚛️ Updating React to version 18..."
npm install react@^18.3.1 react-dom@^18.3.1

# Step 3: Update React testing library
echo "🧪 Updating React testing library..."
npm install @testing-library/react@^16.3.0

# Step 4: TailwindCSS update (stay on v3)
echo "🎨 Updating TailwindCSS..."
npm install tailwindcss@^3.4.17

# Step 5: Fix vulnerabilities
echo "🔒 Fixing security vulnerabilities..."
npm audit fix

echo "✅ Updates complete! Testing the app..."
npm start
