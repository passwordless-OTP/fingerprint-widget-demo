# Fingerprint.com Mock Implementation

This directory contains a mock implementation of the Fingerprint.com (formerly FingerprintJS) identification service. The mock is designed to simulate the behavior of the Fingerprint Pro API for development and testing purposes without requiring a real Fingerprint.com account.

## Features

- **Device Identification**: Generate consistent or random visitor IDs based on device attributes
- **Visitor History**: Track and retrieve visitor history with timestamps and IP addresses
- **Bot Detection**: Simulate bot detection with configurable likelihood scores
- **Incognito Detection**: Detect incognito/private browsing modes
- **Geolocation**: Generate realistic geolocation data based on IP addresses
- **Browser Details**: Extract browser, OS, and device information from user agents
- **Confidence Scoring**: Calculate confidence scores based on available signals
- **JavaScript SDK**: Mock implementation of the Fingerprint.com JavaScript SDK
- **CLI Interface**: Command-line interface for testing and configuration

## Files

- `fingerprint.mock.ts`: Core implementation of the Fingerprint.com mock service
- `fingerprint-sdk.mock.ts`: Mock implementation of the Fingerprint.com JavaScript SDK
- `fingerprint-cli.mock.ts`: CLI interface for testing the Fingerprint mock
- `FingerprintWidget.tsx`: React component for integrating with the Fingerprint SDK
- `fingerprint-demo/page.tsx`: Demo page showcasing the Fingerprint widget

## Usage

### Basic Identification

```typescript
import fingerprintMock, { DeviceAttributes } from './fingerprint.mock';

// Define device attributes
const deviceAttributes: DeviceAttributes = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  language: 'en-US',
  screenResolution: '1920x1080',
  timezone: 'America/New_York',
  platform: 'Win32',
  cores: 8,
  hasSessionStorage: true,
  hasLocalStorage: true,
  hasIndexedDB: true,
  hasWebSql: false,
  hasCanvas: true,
  hasWebGL: true,
  hasAdBlocker: false,
  hasTouch: false,
  colorDepth: 24
};

// Identify the device
const result = fingerprintMock.identify(deviceAttributes);

console.log('Visitor ID:', result.visitorId);
console.log('Confidence Score:', result.confidence.score);
console.log('Bot Likelihood:', result.bot.likelihood);
```

### Using the JavaScript SDK

```typescript
import FingerprintJS from './fingerprint-sdk.mock';

async function identifyVisitor() {
  // Load the Fingerprint agent
  const fp = await FingerprintJS.load({
    apiKey: 'your-api-key',
    region: 'us'
  });
  
  // Get the visitor data
  const result = await fp.get();
  
  console.log('Visitor ID:', result.visitorId);
  console.log('Visitor Found:', result.visitorFound);
}

identifyVisitor();
```

### Using the React Component

```tsx
import FingerprintWidget from '../components/FingerprintWidget';

function MyComponent() {
  const handleIdentify = (visitorId: string, confidence: number) => {
    console.log('Visitor identified:', visitorId, 'with confidence:', confidence);
  };
  
  return (
    <FingerprintWidget 
      apiKey="your-api-key"
      onIdentify={handleIdentify}
    />
  );
}
```

### Using the CLI

The CLI interface provides a convenient way to test the Fingerprint mock implementation:

```bash
# Show help
node cli.js fingerprint help

# Identify a device using a predefined profile
node cli.js fingerprint identify desktop

# Test the JavaScript SDK
node cli.js fingerprint sdk-test mobile

# Show statistics
node cli.js fingerprint stats

# Configure the mock
node cli.js fingerprint set-accuracy high
```

## Configuration

The Fingerprint mock can be configured using the following options:

```typescript
// Enable or disable the fingerprint service
fingerprintMock.enable();
fingerprintMock.disable();

// Set the accuracy level
fingerprintMock.setAccuracyLevel('high'); // 'high', 'medium', 'low'

// Enable or disable bot detection
fingerprintMock.setBotDetection(true);

// Set the number of days to keep visitor history
fingerprintMock.setVisitorHistoryDays(30);

// Set whether to generate consistent identifiers
fingerprintMock.setConsistentIdentifiers(true);
```

## Integration with Firebase Mock

The Fingerprint mock is integrated with the Firebase mock system, sharing the same mock database structure. This allows for seamless integration between the two mocks, with user activity logging and other features working together.

## Limitations

- The mock implementation is simplified compared to the real Fingerprint.com service
- Some advanced features like account linking and custom integrations are not implemented
- The geolocation data is generated randomly and does not reflect real IP geolocation
- The confidence scoring algorithm is simplified and may not match the real service

## Future Improvements

- Add more sophisticated device attribute collection
- Implement more advanced bot detection algorithms
- Add support for custom integrations
- Improve geolocation accuracy with a more realistic database
- Add support for more Fingerprint.com API endpoints 