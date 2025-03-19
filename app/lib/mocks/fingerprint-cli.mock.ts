/**
 * CLI interface for testing the Fingerprint mock implementation
 */

import fingerprintMock, { DeviceAttributes } from './fingerprint.mock';
import FingerprintJS from './fingerprint-sdk.mock';

// Sample device profiles for testing
const deviceProfiles = {
  desktop: {
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
  },
  
  mobile: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    language: 'en-US',
    screenResolution: '390x844',
    timezone: 'America/Los_Angeles',
    platform: 'iPhone',
    cores: 6,
    hasSessionStorage: true,
    hasLocalStorage: true,
    hasIndexedDB: true,
    hasWebSql: true,
    hasCanvas: true,
    hasWebGL: true,
    hasAdBlocker: false,
    hasTouch: true,
    colorDepth: 32
  },
  
  tablet: {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    language: 'en-US',
    screenResolution: '768x1024',
    timezone: 'America/Chicago',
    platform: 'iPad',
    cores: 4,
    hasSessionStorage: true,
    hasLocalStorage: true,
    hasIndexedDB: true,
    hasWebSql: true,
    hasCanvas: true,
    hasWebGL: true,
    hasAdBlocker: false,
    hasTouch: true,
    colorDepth: 32
  },
  
  bot: {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36',
    language: 'en-US',
    screenResolution: '1920x1080',
    timezone: 'UTC',
    platform: 'Linux',
    cores: 2,
    hasSessionStorage: false,
    hasLocalStorage: false,
    hasIndexedDB: false,
    hasWebSql: false,
    hasCanvas: false,
    hasWebGL: false,
    hasAdBlocker: false,
    hasTouch: false,
    colorDepth: 24
  },
  
  incognito: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    language: 'en-US',
    screenResolution: '1920x1080',
    timezone: 'America/New_York',
    platform: 'Win32',
    cores: 8,
    hasSessionStorage: true,
    hasLocalStorage: true,
    hasIndexedDB: false,
    hasWebSql: false,
    hasCanvas: true,
    hasWebGL: true,
    hasAdBlocker: true,
    hasTouch: false,
    colorDepth: 24
  }
};

// Helper function to format a date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Helper function to print a visitor record
function printVisitor(visitorId: string): void {
  const visitor = fingerprintMock.getVisitorHistory(visitorId);
  
  if (visitor.length === 0) {
    console.log(`No visitor found with ID: ${visitorId}`);
    return;
  }
  
  console.log(`\nVisitor ID: ${visitorId}`);
  console.log(`First seen: ${formatDate(visitor[visitor.length - 1].timestamp)}`);
  console.log(`Last seen: ${formatDate(visitor[0].timestamp)}`);
  console.log(`Total visits: ${visitor.length}`);
  
  console.log('\nRecent visits:');
  visitor.slice(0, 5).forEach((visit, index) => {
    console.log(`  ${index + 1}. ${formatDate(visit.timestamp)} - IP: ${visit.ip}`);
  });
}

// Helper function to print identification result
function printIdentificationResult(result: any): void {
  console.log('\nIdentification Result:');
  console.log(`  Visitor ID: ${result.visitorId}`);
  console.log(`  Request ID: ${result.requestId}`);
  console.log(`  Visitor Found: ${result.visitorFound}`);
  console.log(`  Confidence Score: ${result.confidence.score.toFixed(2)}`);
  console.log(`  Confidence Comment: ${result.confidence.comment}`);
  console.log(`  First Seen: ${formatDate(result.firstSeenAt.global)}`);
  console.log(`  Last Seen: ${formatDate(result.lastSeenAt.global)}`);
  console.log(`  Incognito: ${result.incognito}`);
  console.log(`  Bot Likelihood: ${result.bot.likelihood.toFixed(2)}`);
  if (result.bot.type) {
    console.log(`  Bot Type: ${result.bot.type}`);
  }
  
  console.log('\nBrowser Details:');
  console.log(`  Browser: ${result.browserDetails.browserName} ${result.browserDetails.browserVersion}`);
  console.log(`  OS: ${result.browserDetails.os} ${result.browserDetails.osVersion}`);
  console.log(`  Device: ${result.browserDetails.device}`);
  
  console.log('\nLocation:');
  if (result.ipLocation) {
    console.log(`  IP: ${result.ip}`);
    console.log(`  Country: ${result.ipLocation.country}`);
    console.log(`  Region: ${result.ipLocation.region}`);
    if (result.ipLocation.latitude && result.ipLocation.longitude) {
      console.log(`  Coordinates: ${result.ipLocation.latitude.toFixed(4)}, ${result.ipLocation.longitude.toFixed(4)}`);
    }
  } else {
    console.log('  Location data not available');
  }
}

// CLI commands
const commands = {
  // Help command
  help: () => {
    console.log('\nFingerprint Mock CLI Commands:');
    console.log('  help                          - Show this help message');
    console.log('  identify <profile>            - Identify a device using a predefined profile');
    console.log('  identify-custom <json>        - Identify a device using custom attributes (JSON string)');
    console.log('  visitor <visitorId>           - Show details for a specific visitor');
    console.log('  search-ip <ip>                - Search for visitors by IP address');
    console.log('  search-ua <userAgent>         - Search for visitors by user agent');
    console.log('  delete <visitorId>            - Delete a visitor record');
    console.log('  clear                         - Clear all fingerprint data');
    console.log('  stats                         - Show statistics about the fingerprint data');
    console.log('  config                        - Show current configuration');
    console.log('  set-accuracy <level>          - Set accuracy level (high, medium, low)');
    console.log('  set-bot-detection <boolean>   - Enable or disable bot detection');
    console.log('  set-history-days <days>       - Set number of days to keep visitor history');
    console.log('  set-consistent-ids <boolean>  - Enable or disable consistent identifiers');
    console.log('  profiles                      - List available device profiles');
    console.log('  sdk-test <profile>            - Test the JavaScript SDK with a profile');
    console.log('  exit                          - Exit the CLI');
    console.log('\nExamples:');
    console.log('  identify desktop              - Identify a desktop device');
    console.log('  identify-custom {"userAgent": "Custom UA", "language": "fr-FR"}');
    console.log('  set-accuracy high             - Set accuracy level to high');
  },
  
  // List available profiles
  profiles: () => {
    console.log('\nAvailable Device Profiles:');
    Object.keys(deviceProfiles).forEach(profile => {
      console.log(`  - ${profile}`);
    });
    console.log('\nUse "identify <profile>" to test identification with a profile.');
  },
  
  // Identify a device using a predefined profile
  identify: (profileName: string) => {
    if (!profileName) {
      console.log('Error: Profile name is required');
      console.log('Usage: identify <profile>');
      console.log('Available profiles: desktop, mobile, tablet, bot, incognito');
      return;
    }
    
    const profile = deviceProfiles[profileName];
    if (!profile) {
      console.log(`Error: Profile "${profileName}" not found`);
      console.log('Available profiles: desktop, mobile, tablet, bot, incognito');
      return;
    }
    
    console.log(`Identifying device with profile: ${profileName}`);
    const result = fingerprintMock.identify(profile as DeviceAttributes);
    printIdentificationResult(result);
  },
  
  // Identify a device using custom attributes
  identifyCustom: (jsonStr: string) => {
    if (!jsonStr) {
      console.log('Error: JSON string is required');
      console.log('Usage: identify-custom <json>');
      return;
    }
    
    try {
      const customAttributes = JSON.parse(jsonStr);
      
      // Merge with desktop profile for missing attributes
      const attributes = {
        ...deviceProfiles.desktop,
        ...customAttributes
      };
      
      console.log('Identifying device with custom attributes');
      const result = fingerprintMock.identify(attributes as DeviceAttributes);
      printIdentificationResult(result);
    } catch (error) {
      console.log(`Error parsing JSON: ${error.message}`);
    }
  },
  
  // Show details for a specific visitor
  visitor: (visitorId: string) => {
    if (!visitorId) {
      console.log('Error: Visitor ID is required');
      console.log('Usage: visitor <visitorId>');
      return;
    }
    
    printVisitor(visitorId);
  },
  
  // Search for visitors by IP address
  searchIp: (ip: string) => {
    if (!ip) {
      console.log('Error: IP address is required');
      console.log('Usage: search-ip <ip>');
      return;
    }
    
    const visitors = fingerprintMock.searchVisitorsByIp(ip);
    
    if (visitors.length === 0) {
      console.log(`No visitors found with IP: ${ip}`);
      return;
    }
    
    console.log(`\nFound ${visitors.length} visitors with IP: ${ip}`);
    visitors.forEach(visitorId => {
      printVisitor(visitorId);
    });
  },
  
  // Search for visitors by user agent
  searchUa: (userAgent: string) => {
    if (!userAgent) {
      console.log('Error: User agent is required');
      console.log('Usage: search-ua <userAgent>');
      return;
    }
    
    const visitors = fingerprintMock.searchVisitorsByUserAgent(userAgent);
    
    if (visitors.length === 0) {
      console.log(`No visitors found with user agent: ${userAgent}`);
      return;
    }
    
    console.log(`\nFound ${visitors.length} visitors with user agent: ${userAgent}`);
    visitors.forEach(visitorId => {
      printVisitor(visitorId);
    });
  },
  
  // Delete a visitor record
  delete: (visitorId: string) => {
    if (!visitorId) {
      console.log('Error: Visitor ID is required');
      console.log('Usage: delete <visitorId>');
      return;
    }
    
    const success = fingerprintMock.deleteVisitor(visitorId);
    
    if (success) {
      console.log(`Visitor ${visitorId} deleted successfully`);
    } else {
      console.log(`No visitor found with ID: ${visitorId}`);
    }
  },
  
  // Clear all fingerprint data
  clear: () => {
    fingerprintMock.clearAllData();
    console.log('All fingerprint data cleared');
  },
  
  // Show statistics about the fingerprint data
  stats: () => {
    const stats = fingerprintMock.getStats();
    
    console.log('\nFingerprint Data Statistics:');
    console.log(`  Total Visitors: ${stats.visitorCount}`);
    console.log(`  Unique IP Addresses: ${stats.ipCount}`);
    console.log(`  Unique User Agents: ${stats.userAgentCount}`);
    console.log(`  Total Visits: ${stats.totalVisits}`);
  },
  
  // Show current configuration
  config: () => {
    const config = fingerprintMock.getConfig();
    
    console.log('\nCurrent Configuration:');
    console.log(`  Enabled: ${config.enabled}`);
    console.log(`  Accuracy Level: ${config.accuracyLevel}`);
    console.log(`  Bot Detection Enabled: ${config.botDetectionEnabled}`);
    console.log(`  Visitor History Days: ${config.visitorHistoryDays}`);
    console.log(`  Consistent Identifiers: ${config.consistentIdentifiers}`);
  },
  
  // Set accuracy level
  setAccuracy: (level: string) => {
    if (!level || !['high', 'medium', 'low'].includes(level)) {
      console.log('Error: Invalid accuracy level');
      console.log('Usage: set-accuracy <level>');
      console.log('Valid levels: high, medium, low');
      return;
    }
    
    fingerprintMock.setAccuracyLevel(level as 'high' | 'medium' | 'low');
    console.log(`Accuracy level set to: ${level}`);
  },
  
  // Enable or disable bot detection
  setBotDetection: (enabled: string) => {
    if (!enabled || !['true', 'false'].includes(enabled)) {
      console.log('Error: Invalid value');
      console.log('Usage: set-bot-detection <boolean>');
      console.log('Valid values: true, false');
      return;
    }
    
    const isEnabled = enabled === 'true';
    fingerprintMock.setBotDetection(isEnabled);
    console.log(`Bot detection ${isEnabled ? 'enabled' : 'disabled'}`);
  },
  
  // Set number of days to keep visitor history
  setHistoryDays: (days: string) => {
    const numDays = parseInt(days, 10);
    
    if (isNaN(numDays) || numDays < 1) {
      console.log('Error: Invalid number of days');
      console.log('Usage: set-history-days <days>');
      console.log('Days must be a positive integer');
      return;
    }
    
    fingerprintMock.setVisitorHistoryDays(numDays);
    console.log(`Visitor history days set to: ${numDays}`);
  },
  
  // Enable or disable consistent identifiers
  setConsistentIds: (enabled: string) => {
    if (!enabled || !['true', 'false'].includes(enabled)) {
      console.log('Error: Invalid value');
      console.log('Usage: set-consistent-ids <boolean>');
      console.log('Valid values: true, false');
      return;
    }
    
    const isEnabled = enabled === 'true';
    fingerprintMock.setConsistentIdentifiers(isEnabled);
    console.log(`Consistent identifiers ${isEnabled ? 'enabled' : 'disabled'}`);
  },
  
  // Test the JavaScript SDK with a profile
  sdkTest: async (profileName: string) => {
    if (!profileName) {
      console.log('Error: Profile name is required');
      console.log('Usage: sdk-test <profile>');
      console.log('Available profiles: desktop, mobile, tablet, bot, incognito');
      return;
    }
    
    const profile = deviceProfiles[profileName];
    if (!profile) {
      console.log(`Error: Profile "${profileName}" not found`);
      console.log('Available profiles: desktop, mobile, tablet, bot, incognito');
      return;
    }
    
    console.log(`Testing SDK with profile: ${profileName}`);
    console.log('Loading Fingerprint agent...');
    
    try {
      // Load the agent
      const fpAgent = await FingerprintJS.load({
        apiKey: 'mock-api-key',
        region: 'us',
        attributes: profile
      });
      
      console.log('Agent loaded successfully');
      console.log('Getting visitor data...');
      
      // Get visitor data
      const result = await fpAgent.get({ extendedResult: true });
      
      console.log('Visitor data retrieved successfully');
      printIdentificationResult(result);
      
      // Get visitor data again to test caching
      console.log('\nGetting visitor data again (should be found)...');
      const result2 = await fpAgent.get();
      
      console.log(`Visitor found: ${result2.visitorFound}`);
      console.log(`Visitor ID: ${result2.visitorId}`);
    } catch (error) {
      console.log(`Error testing SDK: ${error.message}`);
    }
  }
};

// Parse command line arguments
export function runFingerprintCli(args: string[]): void {
  const command = args[0]?.toLowerCase();
  const params = args.slice(1);
  
  switch (command) {
    case 'help':
      commands.help();
      break;
    case 'identify':
      commands.identify(params[0]);
      break;
    case 'identify-custom':
      commands.identifyCustom(params.join(' '));
      break;
    case 'visitor':
      commands.visitor(params[0]);
      break;
    case 'search-ip':
      commands.searchIp(params[0]);
      break;
    case 'search-ua':
      commands.searchUa(params.join(' '));
      break;
    case 'delete':
      commands.delete(params[0]);
      break;
    case 'clear':
      commands.clear();
      break;
    case 'stats':
      commands.stats();
      break;
    case 'config':
      commands.config();
      break;
    case 'set-accuracy':
      commands.setAccuracy(params[0]);
      break;
    case 'set-bot-detection':
      commands.setBotDetection(params[0]);
      break;
    case 'set-history-days':
      commands.setHistoryDays(params[0]);
      break;
    case 'set-consistent-ids':
      commands.setConsistentIds(params[0]);
      break;
    case 'profiles':
      commands.profiles();
      break;
    case 'sdk-test':
      commands.sdkTest(params[0]);
      break;
    case undefined:
    case '':
      console.log('Fingerprint Mock CLI');
      console.log('Type "help" for a list of commands');
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Type "help" for a list of commands');
  }
}

// Export the CLI commands for use in other modules
export const fingerprintCliCommands = commands; 