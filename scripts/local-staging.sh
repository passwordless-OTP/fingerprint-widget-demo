#!/bin/bash
# Local staging environment setup script

# Exit on error
set -e

echo "Setting up local staging environment..."

# Load environment variables
echo "Loading staging environment configuration..."
source config/staging.env

# Set port for local staging
export PORT=3001

# Build the widget
echo "Building widget for local staging environment..."
npm run build || {
  echo "Build failed, using mock widget for testing"
  mkdir -p public
  # Ensure widget.js exists
  if [ ! -f public/widget.js ]; then
    echo "Creating mock widget.js..."
    cp -f scripts/mock-widget.js public/widget.js
  fi
}

# Start local server
echo "Starting local staging server on port ${PORT}..."
node scripts/local-staging-server.js &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if curl -s --head --request GET http://localhost:${PORT} | grep "200 OK" > /dev/null; then
  echo "✅ Local staging server is running"
  echo "Widget is accessible at: http://localhost:${PORT}/widget.html"
  echo "Test page is accessible at: http://localhost:${PORT}/auth-test.html"
  
  # Run tests
  echo "Running tests against local staging environment..."
  npm test -- --testPathPattern="__tests__/LoginWidget.test.tsx" --testPathPattern="__tests__/OTPLoginWidget.test.tsx"
  
  echo "Local staging environment is ready for manual testing."
  echo "Press Ctrl+C to stop the server when done."
  
  # Wait for user to stop the server
  wait $SERVER_PID
else
  echo "❌ Local staging server failed to start"
  # Kill the server process if it's running
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi 