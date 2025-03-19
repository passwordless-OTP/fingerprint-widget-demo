/**
 * Mock implementation of Fingerprint.com (formerly FingerprintJS) identification service
 * This mock simulates the behavior of the Fingerprint Pro API for development and testing
 */

import { mockDatabase, mockConfig } from './firebase.mock';

// Configuration for the Fingerprint mock service
export const fingerprintConfig = {
  enabled: true,
  accuracyLevel: 'high', // 'high', 'medium', 'low'
  botDetectionEnabled: true,
  visitorHistoryDays: 30, // How many days of history to keep
  consistentIdentifiers: true, // Whether to generate consistent IDs for the same device
};

// Visitor data structure
export interface VisitorData {
  visitorId: string;
  firstSeenAt: number;
  lastSeenAt: number;
  visits: Visit[];
  botLikelihood: number; // 0-1 scale
  incognitoLikelihood: number; // 0-1 scale
  vpnLikelihood: number; // 0-1 scale
  deviceAttributes: DeviceAttributes;
}

// Visit data structure
export interface Visit {
  timestamp: number;
  ip: string;
  userAgent: string;
  geolocation?: Geolocation;
  requestId: string;
  url: string;
  tag?: string; // Optional tag for the visit
}

// Geolocation data structure
export interface Geolocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracyRadius?: number;
  timezone?: string;
}

// Device attributes used for fingerprinting
export interface DeviceAttributes {
  userAgent: string;
  language: string;
  screenResolution: string;
  timezone: string;
  platform: string;
  cores: number;
  hasSessionStorage: boolean;
  hasLocalStorage: boolean;
  hasIndexedDB: boolean;
  hasWebSql: boolean;
  hasCanvas: boolean;
  hasWebGL: boolean;
  hasAdBlocker: boolean;
  hasTouch: boolean;
  colorDepth: number;
  deviceMemory?: number;
  cpuClass?: string;
  plugins?: string[];
  fonts?: string[];
  audio?: string;
  canvas?: string;
  webgl?: string;
}

// Result of identification
export interface IdentifyResult {
  requestId: string;
  visitorId: string;
  confidence: {
    score: number; // 0-1 scale
    comment?: string;
  };
  visitorFound: boolean;
  firstSeenAt: {
    global: number; // Timestamp
    subscription: number; // Timestamp
  };
  lastSeenAt: {
    global: number; // Timestamp
    subscription: number; // Timestamp
  };
  incognito: boolean;
  bot: {
    likelihood: number; // 0-1 scale
    type?: string; // 'automated', 'scraper', 'crawler', etc.
  };
  ip?: string;
  ipLocation?: Geolocation;
  browserDetails: {
    browserName: string;
    browserVersion: string;
    device: string;
    os: string;
    osVersion: string;
    userAgent: string;
  };
}

// Initialize the mock database if it doesn't exist
if (!mockDatabase.fingerprint) {
  mockDatabase.fingerprint = {
    visitors: new Map<string, VisitorData>(),
    ipAddresses: new Map<string, string[]>(), // IP -> visitorIds
    userAgents: new Map<string, string[]>(), // UserAgent -> visitorIds
  };
}

// Helper function to generate a consistent hash from device attributes
function generateHash(attributes: DeviceAttributes): string {
  // In a real implementation, this would use a more sophisticated algorithm
  // For the mock, we'll use a simple string concatenation and hash
  const str = `${attributes.userAgent}|${attributes.language}|${attributes.screenResolution}|${attributes.platform}|${attributes.cores}|${attributes.colorDepth}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string and ensure it's positive
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Generate a random visitor ID
function generateRandomVisitorId(): string {
  return 'fp_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Generate a request ID
function generateRequestId(): string {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Generate a realistic IP address
function generateIpAddress(): string {
  // Generate a random IP address
  // For the mock, we'll generate IPs that look realistic but are deterministic
  // based on the visitor ID to ensure consistency
  const segment1 = Math.floor(Math.random() * 223) + 1; // Avoid reserved ranges
  const segment2 = Math.floor(Math.random() * 255);
  const segment3 = Math.floor(Math.random() * 255);
  const segment4 = Math.floor(Math.random() * 255);
  
  return `${segment1}.${segment2}.${segment3}.${segment4}`;
}

// Generate realistic geolocation data
function generateGeolocation(ip: string): Geolocation {
  // For the mock, we'll generate some realistic but random geolocation data
  // In a real implementation, this would be based on IP geolocation
  
  // Use the IP to seed the random generation for consistency
  const ipSum = ip.split('.').reduce((sum, segment) => sum + parseInt(segment, 10), 0);
  
  // List of countries and regions for realistic data
  const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'IN'];
  const regions = {
    'US': ['California', 'New York', 'Texas', 'Florida', 'Illinois'],
    'UK': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    'CA': ['Ontario', 'Quebec', 'British Columbia', 'Alberta'],
    'AU': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
    'DE': ['Bavaria', 'North Rhine-Westphalia', 'Baden-Württemberg', 'Hesse'],
    'FR': ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie'],
    'JP': ['Tokyo', 'Osaka', 'Kanagawa', 'Aichi'],
    'BR': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'],
    'IN': ['Maharashtra', 'Tamil Nadu', 'Karnataka', 'Gujarat']
  };
  
  // Select country based on IP
  const countryIndex = ipSum % countries.length;
  const country = countries[countryIndex];
  
  // Select region based on country and IP
  const regionList = regions[country] || ['Unknown'];
  const regionIndex = ipSum % regionList.length;
  const region = regionList[regionIndex];
  
  // Generate latitude and longitude based on country
  // These are very approximate ranges for the countries
  let latRange, longRange;
  switch (country) {
    case 'US': latRange = [25, 49]; longRange = [-125, -66]; break;
    case 'UK': latRange = [50, 59]; longRange = [-8, 2]; break;
    case 'CA': latRange = [43, 70]; longRange = [-140, -52]; break;
    case 'AU': latRange = [-43, -10]; longRange = [113, 154]; break;
    case 'DE': latRange = [47, 55]; longRange = [5, 15]; break;
    case 'FR': latRange = [41, 51]; longRange = [-5, 10]; break;
    case 'JP': latRange = [30, 46]; longRange = [129, 146]; break;
    case 'BR': latRange = [-33, 5]; longRange = [-74, -34]; break;
    case 'IN': latRange = [8, 37]; longRange = [68, 97]; break;
    default: latRange = [-90, 90]; longRange = [-180, 180];
  }
  
  // Generate latitude and longitude within the range
  const latSeed = (ipSum * 13) % 100 / 100;
  const longSeed = (ipSum * 17) % 100 / 100;
  
  const latitude = latRange[0] + (latRange[1] - latRange[0]) * latSeed;
  const longitude = longRange[0] + (longRange[1] - longRange[0]) * longSeed;
  
  return {
    country,
    region,
    city: 'Unknown', // We could add cities, but keeping it simple
    latitude,
    longitude,
    accuracyRadius: 50, // km
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// Generate browser details from user agent
function getBrowserDetails(userAgent: string) {
  // In a real implementation, this would parse the user agent string
  // For the mock, we'll extract some basic information
  
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let os = 'Unknown';
  let osVersion = 'Unknown';
  let device = 'Desktop';
  
  // Very basic detection - a real implementation would be more sophisticated
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Edge')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edge\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  
  if (userAgent.includes('Windows')) {
    os = 'Windows';
    if (userAgent.includes('Windows NT 10.0')) osVersion = '10';
    else if (userAgent.includes('Windows NT 6.3')) osVersion = '8.1';
    else if (userAgent.includes('Windows NT 6.2')) osVersion = '8';
    else if (userAgent.includes('Windows NT 6.1')) osVersion = '7';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'Mac OS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
    device = 'Mobile';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    if (match) osVersion = match[1];
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
    device = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
    const match = userAgent.match(/OS (\d+_\d+)/);
    if (match) osVersion = match[1].replace('_', '.');
  }
  
  return {
    browserName,
    browserVersion,
    os,
    osVersion,
    device,
    userAgent
  };
}

// Calculate confidence score based on device attributes and configuration
function calculateConfidence(attributes: DeviceAttributes): number {
  // In a real implementation, this would use a sophisticated algorithm
  // For the mock, we'll use a simple heuristic based on the number of attributes
  
  let score = 0.5; // Base score
  
  // Adjust based on accuracy level configuration
  if (fingerprintConfig.accuracyLevel === 'high') {
    score += 0.3;
  } else if (fingerprintConfig.accuracyLevel === 'low') {
    score -= 0.2;
  }
  
  // Adjust based on available signals
  if (attributes.hasCanvas) score += 0.05;
  if (attributes.hasWebGL) score += 0.05;
  if (attributes.audio) score += 0.05;
  if (attributes.canvas) score += 0.05;
  if (attributes.webgl) score += 0.05;
  
  // Cap the score at 0.99
  return Math.min(0.99, score);
}

// Calculate bot likelihood based on device attributes and behavior
function calculateBotLikelihood(attributes: DeviceAttributes): number {
  // In a real implementation, this would use a sophisticated algorithm
  // For the mock, we'll use a simple heuristic
  
  let likelihood = 0.01; // Base likelihood
  
  // Adjust based on signals that might indicate a bot
  if (!attributes.hasSessionStorage) likelihood += 0.2;
  if (!attributes.hasLocalStorage) likelihood += 0.2;
  if (!attributes.hasCanvas) likelihood += 0.1;
  if (!attributes.hasWebGL) likelihood += 0.1;
  if (attributes.userAgent.includes('HeadlessChrome')) likelihood += 0.5;
  if (attributes.userAgent.includes('PhantomJS')) likelihood += 0.5;
  if (attributes.userAgent.includes('Puppeteer')) likelihood += 0.5;
  if (attributes.userAgent.includes('Selenium')) likelihood += 0.4;
  
  // Cap the likelihood at 0.99
  return Math.min(0.99, likelihood);
}

// Calculate incognito likelihood based on device attributes
function calculateIncognitoLikelihood(attributes: DeviceAttributes): number {
  // In a real implementation, this would use tests for storage limitations
  // For the mock, we'll use a simple heuristic
  
  let likelihood = 0.01; // Base likelihood
  
  // Adjust based on signals that might indicate incognito mode
  if (!attributes.hasIndexedDB) likelihood += 0.3;
  if (!attributes.hasWebSql) likelihood += 0.2;
  
  // Cap the likelihood at 0.99
  return Math.min(0.99, likelihood);
}

// Calculate VPN likelihood based on IP and geolocation
function calculateVpnLikelihood(ip: string, geolocation: Geolocation): number {
  // In a real implementation, this would use IP reputation databases
  // For the mock, we'll use a simple heuristic
  
  // Generate a consistent but random likelihood based on the IP
  const ipSum = ip.split('.').reduce((sum, segment) => sum + parseInt(segment, 10), 0);
  let likelihood = (ipSum % 20) / 100; // 0-0.19 range
  
  // Certain IP ranges are more likely to be VPNs
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
    likelihood += 0.1; // Private IP ranges
  }
  
  // Certain countries are more commonly used for VPNs
  if (geolocation.country === 'RU' || geolocation.country === 'VG' || 
      geolocation.country === 'PA' || geolocation.country === 'SC') {
    likelihood += 0.2;
  }
  
  // Cap the likelihood at 0.99
  return Math.min(0.99, likelihood);
}

// Main identification function
export function identify(attributes: DeviceAttributes): IdentifyResult {
  // Generate a request ID for this identification request
  const requestId = generateRequestId();
  
  // Generate a visitor ID based on the device attributes
  let visitorId: string;
  let visitorFound = false;
  
  if (fingerprintConfig.consistentIdentifiers) {
    // Generate a consistent ID based on device attributes
    const hash = generateHash(attributes);
    visitorId = `fp_${hash}`;
    
    // Check if this visitor already exists
    visitorFound = mockDatabase.fingerprint.visitors.has(visitorId);
  } else {
    // Generate a random ID
    visitorId = generateRandomVisitorId();
    visitorFound = false;
  }
  
  // Generate an IP address for this visit
  const ip = generateIpAddress();
  
  // Generate geolocation data based on the IP
  const geolocation = generateGeolocation(ip);
  
  // Calculate confidence score
  const confidenceScore = calculateConfidence(attributes);
  
  // Calculate bot likelihood
  const botLikelihood = fingerprintConfig.botDetectionEnabled ? 
    calculateBotLikelihood(attributes) : 0;
  
  // Calculate incognito likelihood
  const incognitoLikelihood = calculateIncognitoLikelihood(attributes);
  
  // Calculate VPN likelihood
  const vpnLikelihood = calculateVpnLikelihood(ip, geolocation);
  
  // Get browser details
  const browserDetails = getBrowserDetails(attributes.userAgent);
  
  // Current timestamp
  const now = Date.now();
  
  // Create or update visitor data
  let visitorData: VisitorData;
  
  if (visitorFound) {
    // Update existing visitor
    visitorData = mockDatabase.fingerprint.visitors.get(visitorId);
    visitorData.lastSeenAt = now;
    
    // Add this visit to the history
    visitorData.visits.push({
      timestamp: now,
      ip,
      userAgent: attributes.userAgent,
      geolocation,
      requestId,
      url: 'https://example.com/widget', // Mock URL
    });
    
    // Limit history to configured days
    const cutoff = now - (fingerprintConfig.visitorHistoryDays * 24 * 60 * 60 * 1000);
    visitorData.visits = visitorData.visits.filter(visit => visit.timestamp >= cutoff);
    
    // Update bot likelihood (weighted average with new calculation)
    visitorData.botLikelihood = (visitorData.botLikelihood * 0.7) + (botLikelihood * 0.3);
    
    // Update incognito likelihood
    visitorData.incognitoLikelihood = (visitorData.incognitoLikelihood * 0.7) + (incognitoLikelihood * 0.3);
    
    // Update device attributes (keep the most recent)
    visitorData.deviceAttributes = attributes;
  } else {
    // Create new visitor
    visitorData = {
      visitorId,
      firstSeenAt: now,
      lastSeenAt: now,
      visits: [{
        timestamp: now,
        ip,
        userAgent: attributes.userAgent,
        geolocation,
        requestId,
        url: 'https://example.com/widget', // Mock URL
      }],
      botLikelihood,
      incognitoLikelihood,
      vpnLikelihood,
      deviceAttributes: attributes,
    };
    
    // Store the new visitor
    mockDatabase.fingerprint.visitors.set(visitorId, visitorData);
  }
  
  // Update IP address mapping
  if (!mockDatabase.fingerprint.ipAddresses.has(ip)) {
    mockDatabase.fingerprint.ipAddresses.set(ip, []);
  }
  const ipVisitors = mockDatabase.fingerprint.ipAddresses.get(ip);
  if (!ipVisitors.includes(visitorId)) {
    ipVisitors.push(visitorId);
  }
  
  // Update user agent mapping
  if (!mockDatabase.fingerprint.userAgents.has(attributes.userAgent)) {
    mockDatabase.fingerprint.userAgents.set(attributes.userAgent, []);
  }
  const uaVisitors = mockDatabase.fingerprint.userAgents.get(attributes.userAgent);
  if (!uaVisitors.includes(visitorId)) {
    uaVisitors.push(visitorId);
  }
  
  // Create the identification result
  const result: IdentifyResult = {
    requestId,
    visitorId,
    confidence: {
      score: confidenceScore,
      comment: confidenceScore > 0.8 ? 'High confidence identification' : 
               confidenceScore > 0.5 ? 'Medium confidence identification' : 
               'Low confidence identification'
    },
    visitorFound,
    firstSeenAt: {
      global: visitorData.firstSeenAt,
      subscription: visitorData.firstSeenAt, // Same for mock
    },
    lastSeenAt: {
      global: visitorData.lastSeenAt,
      subscription: visitorData.lastSeenAt, // Same for mock
    },
    incognito: incognitoLikelihood > 0.5,
    bot: {
      likelihood: botLikelihood,
      type: botLikelihood > 0.7 ? 'automated' : 
            botLikelihood > 0.5 ? 'suspicious' : 
            undefined
    },
    ip,
    ipLocation: geolocation,
    browserDetails
  };
  
  return result;
}

// Get visitor history
export function getVisitorHistory(visitorId: string): Visit[] {
  const visitor = mockDatabase.fingerprint.visitors.get(visitorId);
  if (!visitor) {
    return [];
  }
  
  return [...visitor.visits].sort((a, b) => b.timestamp - a.timestamp);
}

// Search for visitors by IP address
export function searchVisitorsByIp(ip: string): string[] {
  return mockDatabase.fingerprint.ipAddresses.get(ip) || [];
}

// Search for visitors by user agent
export function searchVisitorsByUserAgent(userAgent: string): string[] {
  return mockDatabase.fingerprint.userAgents.get(userAgent) || [];
}

// Delete visitor data (for privacy compliance)
export function deleteVisitor(visitorId: string): boolean {
  const visitor = mockDatabase.fingerprint.visitors.get(visitorId);
  if (!visitor) {
    return false;
  }
  
  // Remove from visitors map
  mockDatabase.fingerprint.visitors.delete(visitorId);
  
  // Remove from IP address mappings
  for (const [ip, visitors] of mockDatabase.fingerprint.ipAddresses.entries()) {
    const index = visitors.indexOf(visitorId);
    if (index !== -1) {
      visitors.splice(index, 1);
      if (visitors.length === 0) {
        mockDatabase.fingerprint.ipAddresses.delete(ip);
      }
    }
  }
  
  // Remove from user agent mappings
  for (const [ua, visitors] of mockDatabase.fingerprint.userAgents.entries()) {
    const index = visitors.indexOf(visitorId);
    if (index !== -1) {
      visitors.splice(index, 1);
      if (visitors.length === 0) {
        mockDatabase.fingerprint.userAgents.delete(ua);
      }
    }
  }
  
  return true;
}

// Clear all fingerprint data
export function clearAllData(): void {
  mockDatabase.fingerprint.visitors.clear();
  mockDatabase.fingerprint.ipAddresses.clear();
  mockDatabase.fingerprint.userAgents.clear();
}

// Configuration functions
export const fingerprintMock = {
  // Enable or disable the fingerprint service
  enable: () => {
    fingerprintConfig.enabled = true;
    return fingerprintConfig.enabled;
  },
  
  // Disable the fingerprint service
  disable: () => {
    fingerprintConfig.enabled = false;
    return !fingerprintConfig.enabled;
  },
  
  // Check if the fingerprint service is enabled
  isEnabled: () => fingerprintConfig.enabled,
  
  // Set the accuracy level
  setAccuracyLevel: (level: 'high' | 'medium' | 'low') => {
    fingerprintConfig.accuracyLevel = level;
    return fingerprintConfig.accuracyLevel;
  },
  
  // Enable or disable bot detection
  setBotDetection: (enabled: boolean) => {
    fingerprintConfig.botDetectionEnabled = enabled;
    return fingerprintConfig.botDetectionEnabled;
  },
  
  // Set the number of days to keep visitor history
  setVisitorHistoryDays: (days: number) => {
    fingerprintConfig.visitorHistoryDays = days;
    return fingerprintConfig.visitorHistoryDays;
  },
  
  // Set whether to generate consistent identifiers
  setConsistentIdentifiers: (consistent: boolean) => {
    fingerprintConfig.consistentIdentifiers = consistent;
    return fingerprintConfig.consistentIdentifiers;
  },
  
  // Get the current configuration
  getConfig: () => ({ ...fingerprintConfig }),
  
  // Get statistics about the fingerprint data
  getStats: () => ({
    visitorCount: mockDatabase.fingerprint.visitors.size,
    ipCount: mockDatabase.fingerprint.ipAddresses.size,
    userAgentCount: mockDatabase.fingerprint.userAgents.size,
    totalVisits: Array.from(mockDatabase.fingerprint.visitors.values())
      .reduce((sum, visitor) => sum + visitor.visits.length, 0)
  }),
  
  // API methods
  identify,
  getVisitorHistory,
  searchVisitorsByIp,
  searchVisitorsByUserAgent,
  deleteVisitor,
  clearAllData
};

// Export the mock Fingerprint client
export default fingerprintMock; 