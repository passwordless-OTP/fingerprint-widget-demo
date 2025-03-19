/**
 * Mock implementation of the Fingerprint.com JavaScript SDK
 * This mock simulates the behavior of the @fingerprintjs/fingerprintjs-pro package
 */

import fingerprintMock, { DeviceAttributes } from './fingerprint.mock';

// Default attributes for the browser environment
const defaultAttributes: DeviceAttributes = {
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
  colorDepth: 24,
  deviceMemory: 8,
  plugins: ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer', 'Microsoft Edge PDF Viewer', 'WebKit built-in PDF'],
  fonts: ['Arial', 'Courier', 'Georgia', 'Times New Roman', 'Verdana'],
  audio: 'audio-fingerprint-hash',
  canvas: 'canvas-fingerprint-hash',
  webgl: 'webgl-fingerprint-hash'
};

// Mock agent class
class FingerprintAgent {
  private apiKey: string;
  private region: string;
  private endpoint: string;
  private attributes: DeviceAttributes;
  
  constructor(options: { 
    apiKey: string, 
    region?: string, 
    endpoint?: string,
    attributes?: Partial<DeviceAttributes>
  }) {
    this.apiKey = options.apiKey;
    this.region = options.region || 'us';
    this.endpoint = options.endpoint || 'https://fp.example.com';
    
    // Merge default attributes with any provided attributes
    this.attributes = {
      ...defaultAttributes,
      ...(options.attributes || {})
    };
    
    console.log(`[Fingerprint Mock] Initialized with API key: ${this.apiKey}, region: ${this.region}`);
  }
  
  // Get the visitor data
  async get(options?: { 
    extendedResult?: boolean,
    linkedId?: string,
    tag?: string
  }): Promise<{
    visitorId: string,
    visitorFound: boolean,
    requestId: string,
    confidence: { score: number, comment?: string },
    [key: string]: any
  }> {
    console.log(`[Fingerprint Mock] Getting visitor data with options:`, options);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the identification result
    const result = fingerprintMock.identify(this.attributes);
    
    // If extended result is requested, return the full result
    if (options?.extendedResult) {
      return result;
    }
    
    // Otherwise, return a simplified result
    return {
      visitorId: result.visitorId,
      visitorFound: result.visitorFound,
      requestId: result.requestId,
      confidence: result.confidence
    };
  }
}

// Mock FingerprintJS namespace
const FingerprintJS = {
  // Load the agent
  load: async (options: { 
    apiKey: string, 
    region?: string, 
    endpoint?: string,
    attributes?: Partial<DeviceAttributes>
  }): Promise<FingerprintAgent> => {
    console.log(`[Fingerprint Mock] Loading agent with options:`, options);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Return a new agent instance
    return new FingerprintAgent(options);
  }
};

export default FingerprintJS; 