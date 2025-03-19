# SSO+ for Shopify

A modern OTP-based phone verification login widget for Shopify stores.

## Features

- Phone number verification via OTP
- Firebase Authentication integration
- Device fingerprinting via Fingerprint.js Pro
- Allow/Block list functionality
- Secure admin interface with phone-based authentication
- Clean monochrome UI that adapts to store themes
- Multi-country phone format support

## Project Status

### Completed Features
- ✅ Code isolation and modularization
- ✅ Widget styling and UI improvements
- ✅ Integration with third-party services
- ✅ Device fingerprinting integration
- ✅ Staging deployment pipeline
- ✅ Canary deployment system
- ✅ Production deployment pipeline
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Automated Canary-to-Production promotion
- ✅ Automated Rollback System

### In Progress
- 🔄 Test coverage improvement

### Upcoming Features
- A/B Testing Framework
- Enhanced Business Metrics

For more details, see the [Phase Completion Report](docs/phase-completion-report.md).

## CI/CD Pipeline

This project uses a comprehensive CI/CD pipeline implemented with GitHub Actions:

1. **Test & Lint**: Automated tests and code quality checks
2. **Build**: Application build process
3. **Deployment**: Progressive deployment through canary, staging, and production
4. **Monitoring**: Automated monitoring and rollback capabilities

For detailed setup instructions, see [CI-CD-SETUP.md](CI-CD-SETUP.md).

## GitHub Setup

This project uses GitHub for issue tracking and project management. We have set up:

- Issue templates for different types of tasks
- Labels for categorization and prioritization
- Project board for tracking progress
- Workflow automation for project management

For more details, see the [GitHub Setup Documentation](docs/github-setup.md).

To create GitHub issues for the current tickets:

```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token

# Run the setup script
./scripts/setup-github.sh your_token
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account (optional when using mock mode)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd sso-plus-shopify
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Set up Firebase configuration
Create a `.env.local` file in the root directory with your Firebase configuration:

#### Option 1: Using Mock Firebase (for development)
```
# Firebase Configuration (can be empty when using mock)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Use mock Firebase for development
NEXT_PUBLIC_USE_MOCK_FIREBASE=true
```

#### Option 2: Using Real Firebase
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Set to false to use real Firebase
NEXT_PUBLIC_USE_MOCK_FIREBASE=false
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

## Mock Firebase Service

For development and testing purposes, the application includes a mock Firebase service that simulates Firebase Authentication and Firestore functionality without requiring a real Firebase project.

### Features of Mock Firebase:

- **Phone Authentication**: Simulates OTP verification with a fixed code "1234"
- **User Management**: Creates and manages mock user accounts
- **Allow/Block Lists**: Includes pre-configured allow and block lists
- **User Activity Logging**: Tracks user actions with a configurable binary switch
- **No External Dependencies**: Works completely offline

### Using Mock Firebase:

1. Set `NEXT_PUBLIC_USE_MOCK_FIREBASE=true` in your `.env.local` file
2. Use the application as normal - all Firebase operations will be simulated
3. For testing, use "1234" as the OTP code
4. Pre-configured allowed numbers: "(555) 123-4567", "+1234567890", "+447911123456", "+919876543210"
5. Pre-configured blocked numbers: "(555) 999-9999", "+1999999999"
6. User activity logging is disabled by default but can be enabled for debugging and testing

### User Activity Logging

The mock Firebase implementation includes a user activity logging feature that can be enabled during development and testing:

```typescript
import { mockFirebase } from '../app/lib/mocks/firebase.mock';

// Enable logging
mockFirebase.userActivity.enableLogging();

// Get logs
const logs = mockFirebase.userActivity.getLogs();

// Filter logs by user, phone number, or action
const userLogs = mockFirebase.userActivity.getUserLogs('user123');
const phoneLogs = mockFirebase.userActivity.getPhoneNumberLogs('+1234567890');
const actionLogs = mockFirebase.userActivity.getActionLogs('login');

// Disable logging when done
mockFirebase.userActivity.disableLogging();
```

For more details, see the [User Activity Logging documentation](docs/UserActivityLogging.md).

## Project Structure

- `/app` - Next.js application files
  - `/components` - React components
    - `OTPLoginWidget.tsx` - Main login widget component
    - `AllowBlockListAdmin.tsx` - Admin interface for managing allow/block lists
    - `AdminLogin.tsx` - Admin authentication component
    - `AdminProtectedRoute.tsx` - Component to protect admin routes
    - `AdminHeader.tsx` - Admin interface header with logout functionality
  - `/contexts` - React context providers
    - `AdminAuthContext.tsx` - Context for admin authentication state
  - `/lib` - Utility functions and Firebase setup
    - `/mocks` - Mock services for testing and development
      - `firebase.mock.ts` - Mock Firebase implementation with user activity logging
  - `/api` - API routes
  - `/admin` - Admin pages
    - `page.tsx` - Admin dashboard page
- `/public` - Static assets
- `/__tests__` - Test files
  - `AdminAuth.test.tsx` - Tests for admin authentication
  - `AllowBlockList.test.ts` - Tests for allow/block list functionality
  - `AllowBlockListIntegration.test.ts` - Integration tests for allow/block list
  - `DeviceFingerprint.test.ts` - Tests for device fingerprinting
  - `OTPLoginWidget.test.tsx` - Tests for the login widget
  - `TempBlockList.test.ts` - Tests for temporary blocking functionality
  - `UserActivityLogging.test.ts` - Tests for user activity logging feature

## Testing

Run the test suite with:
```bash
npm test
# or
yarn test
```

The tests use the mock Firebase service automatically, so no real Firebase project is required.

## Deployment

This application can be deployed to Vercel or any other Next.js compatible hosting service.

For production deployment, make sure to:
1. Set up a real Firebase project with Phone Authentication enabled
2. Configure the environment variables with your Firebase credentials
3. Set `NEXT_PUBLIC_USE_MOCK_FIREBASE=false`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Admin Interface

The application includes a secure admin interface for managing the Allow/Block lists. The admin interface is protected by phone-based authentication:

1. Only authorized admin phone numbers can access the admin interface
2. Admin authentication uses the same OTP verification flow as regular users
3. The default admin phone number is +1-323-244-9265 (configurable in the code)

To access the admin interface:
1. Navigate to `/admin`
2. Enter the admin phone number
3. Verify with the OTP code
4. Manage Allow/Block lists through the admin dashboard

For security reasons, the admin interface should only be accessible to authorized personnel.

# Admin CLI for SSO+ Shopify Widget

A comprehensive command-line interface for managing and simulating various aspects of the SSO+ Shopify Widget, including device profiles, human behavior, and automation tools.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Make the CLI executable
chmod +x admin-cli.js
chmod +x admin-cli/autocomplete.js
```

## Features

- **Device Simulation**: Simulate different devices with specific browser, OS, and hardware characteristics
- **Human Behavior Simulation**: Simulate human-like interactions with varying degrees of "humanness"
- **Automation Tool Simulation**: Simulate different automation tools with configurable detection levels
- **Combined Simulation**: Integrate all three simulation types for comprehensive testing

## Basic Usage

```bash
./admin-cli.js [command] [subcommand] [options]
```

## Available Commands

### Device Simulation

```bash
# List all available device profiles
./admin-cli.js device list

# Show details for a specific device
./admin-cli.js device show iphone-safari

# Simulate a request from a specific device
./admin-cli.js device simulate-request android-chrome http://localhost:3000/api/login

# Compare two device profiles
./admin-cli.js device compare windows-chrome android-chrome

# Run a network test for a specific device
./admin-cli.js device network-test iphone-safari latency
```

### Human Behavior Simulation

```bash
# Create a human behavior simulator
./admin-cli.js human create --humanness 0.8

# Show statistics for a human behavior simulator
./admin-cli.js human stats --humanness 0.7

# Simulate widget interaction
./admin-cli.js human simulate-widget --humanness 0.7

# Manage human behavior configurations
./admin-cli.js human config list
```

### Automation Tool Simulation

```bash
# List available automation tools
./admin-cli.js tool list

# Simulate an automation tool
./admin-cli.js tool simulate --name Playwright --detection 0.3

# Manage tool configurations
./admin-cli.js tool config list
```

### Combined Simulation

```bash
# Run a full combined simulation
./admin-cli.js combined run --device macos-safari --humanness 0.9 --tool Cypress --detection 0.2

# Run a device + human simulation
./admin-cli.js combined device-human --device iphone-safari --humanness 0.7

# Run a device + tool simulation
./admin-cli.js combined device-tool --device android-chrome --tool Playwright --detection 0.3

# Manage combined simulation configurations
./admin-cli.js combined config list
```

## Auto-Completion

This CLI supports auto-completion for commands, subcommands, and options. To enable auto-completion:

### One-time Usage

```bash
# For Bash or Zsh
source <(./admin-cli.js --completion)

# For Fish
./admin-cli.js --completion | source
```

### Permanent Setup

Add one of the following lines to your shell profile file (~/.bashrc, ~/.zshrc, etc.):

```bash
# For Bash or Zsh
source <(path/to/admin-cli.js --completion)

# For Fish (in ~/.config/fish/config.fish)
path/to/admin-cli.js --completion | source
```

After enabling auto-completion, you can use the Tab key to:
- Complete commands and subcommands
- View available options
- Complete option values (like device profiles, humanness levels, etc.)

## Default Values

Many commands have default values. For example, the URL defaults to http://localhost:3000:

```bash
# This will use http://localhost:3000 as the URL
./admin-cli.js combined run --device macos-safari --humanness 0.9 --tool Cypress --detection 0.2

# This specifies a custom URL
./admin-cli.js combined run --device macos-safari --humanness 0.9 --tool Cypress --detection 0.2 --url https://example.com/login
```

## Getting Help

```bash
# General help
./admin-cli.js --help

# Help for a specific command
./admin-cli.js device --help

# Help for a specific subcommand
./admin-cli.js combined run --help
```

## NPM Integration

You can also run the CLI using npm:

```bash
# Add to package.json
"scripts": {
  "admin-cli": "node admin-cli.js"
}

# Then run
npm run admin-cli -- device list
```

## SSO+ Shopify Widget Service

The SSO+ Shopify Widget service is a Next.js application that can be managed through the admin-cli tool.

### Requirements

- Node.js version `>=18.18.0` (Next.js requirement)
- npm (for package management)

If you're using nvm, you can set the correct Node.js version with:

```bash
nvm use 18.19.0  # or any version >=18.18.0
```

### Installation

Install the required dependencies:

```bash
npm install
```

### Managing the Widget Service

The widget service can be managed using the following commands:

```bash
# Start the widget service in development mode
./admin-cli.js service start --dev

# Start the widget service in production mode
./admin-cli.js service start

# Check the status of the widget service
./admin-cli.js service status

# Stop the widget service
./admin-cli.js service stop
```

When running, the widget can be accessed at: http://localhost:3000 