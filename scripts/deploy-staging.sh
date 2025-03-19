#!/bin/bash
# Deployment script for staging environment

# Exit on any error
set -e

echo "🚀 Deploying to staging environment..."

# Deploy to Firebase Hosting preview channel
firebase hosting:channel:deploy staging --expires 7d

echo "✅ Staging deployment complete!"
echo "Preview URL: $(firebase hosting:channel:open staging --url)"

# Create config directory if it doesn't exist
mkdir -p config

# Load environment variables
echo "Loading staging environment configuration..."
source config/staging.env

# Build the widget
echo "Building widget for staging environment..."
npm run build

# Package the widget
echo "Packaging widget files..."
mkdir -p dist/staging
cp -r public/* dist/staging/
cp -r .next dist/staging/

# Create staging-specific configuration
echo "Creating staging-specific configuration..."
cat > dist/staging/config.js << EOL
window.WIDGET_CONFIG = {
  environment: 'staging',
  version: '${WIDGET_VERSION}',
  theme: '${WIDGET_THEME}',
  language: '${WIDGET_LANGUAGE}',
  enableAnalytics: ${ENABLE_ANALYTICS},
  analyticsEndpoint: '${ANALYTICS_ENDPOINT}',
  logEndpoint: '${LOG_ENDPOINT}',
  errorTrackingEndpoint: '${ERROR_TRACKING_ENDPOINT}',
  fingerprint: {
    enabled: true,
    apiKey: '${FINGERPRINT_API_KEY}',
    endpoint: '${FINGERPRINT_ENDPOINT}'
  },
  features: {
    otpVerification: ${ENABLE_OTP_VERIFICATION},
    phoneFormatting: ${ENABLE_PHONE_FORMATTING},
    userActivityLogging: ${ENABLE_USER_ACTIVITY_LOGGING},
    deviceFingerprinting: ${ENABLE_DEVICE_FINGERPRINTING}
  }
};
EOL

# Deploy to staging server
echo "Deploying to staging server..."
# This would typically use scp, rsync, or a deployment tool like AWS S3, Azure Blob Storage, etc.
# For demonstration purposes, we'll just simulate the deployment
echo "Simulating deployment to staging server..."
sleep 2

# Run tests in staging environment
echo "Running tests in staging environment..."
# This would typically connect to the staging environment and run tests
# For demonstration purposes, we'll just simulate the tests
echo "Simulating tests in staging environment..."
sleep 2

echo "Deployment to staging environment completed successfully!"
echo "Widget is now accessible at: https://staging.example.com/widget.html"
echo "Test page is accessible at: https://staging.example.com/auth-test.html"

# Output deployment information
echo "Deployment Information:"
echo "  Environment: Staging"
echo "  Version: ${WIDGET_VERSION}"
echo "  Deployed at: $(date)"
echo "  Server: staging.example.com"
echo "  Features:"
echo "    - OTP Verification: ${ENABLE_OTP_VERIFICATION}"
echo "    - Phone Formatting: ${ENABLE_PHONE_FORMATTING}"
echo "    - User Activity Logging: ${ENABLE_USER_ACTIVITY_LOGGING}"
echo "    - Device Fingerprinting: ${ENABLE_DEVICE_FINGERPRINTING}"

echo "Next steps:"
echo "1. Verify the widget is accessible at the staging URL"
echo "2. Run automated tests against the staging deployment"
echo "3. Perform manual testing of all features"
echo "4. Verify integration with backend services"
echo "5. Validate analytics and logging functionality" 