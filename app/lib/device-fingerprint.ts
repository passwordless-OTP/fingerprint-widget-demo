/**
 * Device Fingerprinting Service
 * 
 * This service provides functions to generate, store, and check device fingerprints
 * for enhanced security and fraud prevention.
 */

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db, USE_MOCK_FIREBASE } from './firebase.service';

// Collection name for device fingerprints
const DEVICE_FINGERPRINTS_COLLECTION = 'deviceFingerprints';

// Mock database for testing
const mockDeviceFingerprints = new Map<string, any>();

/**
 * Generate a device fingerprint based on various device attributes
 * @returns A promise that resolves with the fingerprint hash
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    return 'server-side-rendering';
  }
  
  try {
    // Collect various device attributes
    const fingerprint = {
      // Screen properties
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
      },
      
      // Browser information
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: Array.isArray(navigator.languages) ? navigator.languages : [navigator.language],
        platform: navigator.platform,
        doNotTrack: navigator.doNotTrack,
        cookieEnabled: navigator.cookieEnabled,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      
      // Hardware information
      hardware: {
        cpuCores: navigator.hardwareConcurrency || 'unknown',
        memory: (navigator as any).deviceMemory || 'unknown',
      },
      
      // Canvas fingerprinting (creates a unique image based on rendering differences)
      canvas: await getCanvasFingerprint(),
      
      // WebGL information
      webgl: getWebGLFingerprint(),
      
      // Available fonts (simplified for performance)
      fonts: await detectBasicFonts(),
    };
    
    // Create a hash of the fingerprint data
    const fingerprintString = JSON.stringify(fingerprint);
    const fingerprintHash = await sha256(fingerprintString);
    
    return fingerprintHash;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Return a fallback fingerprint based on user agent
    return sha256(navigator.userAgent);
  }
};

/**
 * Helper function to create canvas fingerprint
 * @returns A promise that resolves with the canvas fingerprint
 */
const getCanvasFingerprint = async (): Promise<string> => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas-not-supported';
    
    // Text with different styles
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#F60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas', 4, 17);
    
    // Get the data URL and hash it
    const dataURL = canvas.toDataURL();
    return sha256(dataURL);
  } catch (error) {
    console.error('Error creating canvas fingerprint:', error);
    return 'canvas-error';
  }
};

/**
 * Helper function for WebGL fingerprinting
 * @returns A string representation of WebGL information
 */
const getWebGLFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'webgl-not-supported';
    
    // Type assertion to WebGLRenderingContext
    const webgl = gl as WebGLRenderingContext;
    
    const info = {
      vendor: webgl.getParameter(webgl.VENDOR),
      renderer: webgl.getParameter(webgl.RENDERER),
      // Only include a subset of extensions for performance
      extensions: webgl.getSupportedExtensions()?.slice(0, 10) || [],
    };
    
    return JSON.stringify(info);
  } catch (error) {
    console.error('Error creating WebGL fingerprint:', error);
    return 'webgl-error';
  }
};

/**
 * Helper function to detect available fonts
 * @returns A promise that resolves with an array of detected fonts
 */
const detectBasicFonts = async (): Promise<string[]> => {
  try {
    // Basic font detection using a simplified approach
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const fontList = [
      'Arial', 'Courier New', 'Georgia', 'Times New Roman', 
      'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS'
    ];
    
    const detected: string[] = [];
    
    for (const font of fontList) {
      let isDetected = false;
      
      for (const baseFont of baseFonts) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        // Measure with base font
        ctx.font = `72px ${baseFont}`;
        const baseFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
        
        // Measure with test font, fallback to base font
        ctx.font = `72px ${font}, ${baseFont}`;
        const testFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
        
        // If widths are different, the font is available
        if (baseFontWidth !== testFontWidth) {
          isDetected = true;
          break;
        }
      }
      
      if (isDetected) {
        detected.push(font);
      }
    }
    
    return detected;
  } catch (error) {
    console.error('Error detecting fonts:', error);
    return [];
  }
};

/**
 * Helper function for SHA-256 hashing
 * @param message - The message to hash
 * @returns A promise that resolves with the hash as a hex string
 */
const sha256 = async (message: string): Promise<string> => {
  try {
    // Use the Web Crypto API for hashing
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error hashing message:', error);
    
    // Fallback to a simple hash function if Web Crypto API is not available
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

/**
 * Store a device fingerprint with associated user information
 * @param fingerprint - The device fingerprint
 * @param userId - The user ID
 * @param phoneNumber - The phone number
 * @returns A promise that resolves when the operation is complete
 */
export const storeDeviceFingerprint = async (
  fingerprint: string, 
  userId: string, 
  phoneNumber: string
): Promise<void> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    const existingData = mockDeviceFingerprints.get(fingerprint);
    
    if (existingData) {
      // Update existing fingerprint
      const users = existingData.users || [];
      const phoneNumbers = existingData.phoneNumbers || [];
      
      if (!users.includes(userId)) {
        users.push(userId);
      }
      
      if (!phoneNumbers.includes(phoneNumber)) {
        phoneNumbers.push(phoneNumber);
      }
      
      mockDeviceFingerprints.set(fingerprint, {
        ...existingData,
        users,
        phoneNumbers,
        lastSeen: new Date().toISOString(),
        loginCount: (existingData.loginCount || 0) + 1
      });
    } else {
      // Create new fingerprint
      mockDeviceFingerprints.set(fingerprint, {
        fingerprint,
        users: [userId],
        phoneNumbers: [phoneNumber],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        loginCount: 1,
        blocked: false,
        suspiciousActivity: false
      });
    }
    
    return;
  }
  
  try {
    // Check if this fingerprint already exists
    const fingerprintDoc = doc(db, DEVICE_FINGERPRINTS_COLLECTION, fingerprint);
    const fingerprintSnapshot = await getDoc(fingerprintDoc);
    
    if (fingerprintSnapshot.exists()) {
      // Update existing fingerprint document
      const data = fingerprintSnapshot.data();
      const users = data.users || [];
      const phoneNumbers = data.phoneNumbers || [];
      
      // Add user and phone number if not already present
      if (!users.includes(userId)) {
        users.push(userId);
      }
      
      if (!phoneNumbers.includes(phoneNumber)) {
        phoneNumbers.push(phoneNumber);
      }
      
      await updateDoc(fingerprintDoc, {
        users,
        phoneNumbers,
        lastSeen: new Date().toISOString(),
        loginCount: (data.loginCount || 0) + 1
      });
    } else {
      // Create new fingerprint document
      await setDoc(fingerprintDoc, {
        fingerprint,
        users: [userId],
        phoneNumbers: [phoneNumber],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        loginCount: 1,
        blocked: false,
        suspiciousActivity: false
      });
    }
  } catch (error) {
    console.error('Error storing device fingerprint:', error);
  }
};

/**
 * Check if a device is blocked
 * @param fingerprint - The device fingerprint
 * @returns A promise that resolves with a boolean indicating if the device is blocked
 */
export const isDeviceBlocked = async (fingerprint: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    const data = mockDeviceFingerprints.get(fingerprint);
    return data?.blocked === true;
  }
  
  try {
    const fingerprintDoc = doc(db, DEVICE_FINGERPRINTS_COLLECTION, fingerprint);
    const fingerprintSnapshot = await getDoc(fingerprintDoc);
    
    if (fingerprintSnapshot.exists()) {
      const data = fingerprintSnapshot.data();
      return data.blocked === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking device block status:', error);
    return false;
  }
};

/**
 * Block a device by its fingerprint
 * @param fingerprint - The device fingerprint
 * @param reason - The reason for blocking
 * @returns A promise that resolves with a boolean indicating if the operation was successful
 */
export const blockDevice = async (
  fingerprint: string, 
  reason: string
): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    const data = mockDeviceFingerprints.get(fingerprint);
    
    if (data) {
      mockDeviceFingerprints.set(fingerprint, {
        ...data,
        blocked: true,
        blockReason: reason,
        blockedAt: new Date().toISOString()
      });
    }
    
    return true;
  }
  
  try {
    const fingerprintDoc = doc(db, DEVICE_FINGERPRINTS_COLLECTION, fingerprint);
    await updateDoc(fingerprintDoc, {
      blocked: true,
      blockReason: reason,
      blockedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error blocking device:', error);
    return false;
  }
};

/**
 * Unblock a device by its fingerprint
 * @param fingerprint - The device fingerprint
 * @returns A promise that resolves with a boolean indicating if the operation was successful
 */
export const unblockDevice = async (fingerprint: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    const data = mockDeviceFingerprints.get(fingerprint);
    
    if (data) {
      mockDeviceFingerprints.set(fingerprint, {
        ...data,
        blocked: false,
        blockReason: null,
        blockedAt: null,
        unblockedAt: new Date().toISOString()
      });
    }
    
    return true;
  }
  
  try {
    const fingerprintDoc = doc(db, DEVICE_FINGERPRINTS_COLLECTION, fingerprint);
    await updateDoc(fingerprintDoc, {
      blocked: false,
      blockReason: null,
      blockedAt: null,
      unblockedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error unblocking device:', error);
    return false;
  }
};

/**
 * Flag suspicious activity based on patterns
 * @param fingerprint - The device fingerprint
 * @returns A promise that resolves with a boolean indicating if the device is suspicious
 */
export const detectSuspiciousActivity = async (fingerprint: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    const data = mockDeviceFingerprints.get(fingerprint);
    
    if (!data) return false;
    
    // Check for suspicious patterns
    const isSuspicious = 
      data.phoneNumbers.length > 5 || // Too many phone numbers from same device
      data.loginCount > 50 || // Excessive login attempts
      data.users.length > 3; // Too many different user accounts
    
    if (isSuspicious && !data.suspiciousActivity) {
      // Mark as suspicious
      mockDeviceFingerprints.set(fingerprint, {
        ...data,
        suspiciousActivity: true,
        suspiciousReason: determineReason(data),
        flaggedAt: new Date().toISOString()
      });
    }
    
    return isSuspicious;
  }
  
  try {
    const fingerprintDoc = doc(db, DEVICE_FINGERPRINTS_COLLECTION, fingerprint);
    const fingerprintSnapshot = await getDoc(fingerprintDoc);
    
    if (fingerprintSnapshot.exists()) {
      const data = fingerprintSnapshot.data();
      
      // Check for suspicious patterns
      const isSuspicious = 
        data.phoneNumbers.length > 5 || // Too many phone numbers from same device
        data.loginCount > 50 || // Excessive login attempts
        data.users.length > 3; // Too many different user accounts
      
      if (isSuspicious && !data.suspiciousActivity) {
        // Mark as suspicious
        await updateDoc(fingerprintDoc, {
          suspiciousActivity: true,
          suspiciousReason: determineReason(data),
          flaggedAt: new Date().toISOString()
        });
      }
      
      return isSuspicious;
    }
    
    return false;
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return false;
  }
};

/**
 * Determine the reason for flagging a device as suspicious
 * @param data - The device data
 * @returns A string describing the reason
 */
const determineReason = (data: any): string => {
  if (data.phoneNumbers.length > 5) {
    return 'Too many phone numbers associated with this device';
  }
  
  if (data.loginCount > 50) {
    return 'Excessive login attempts from this device';
  }
  
  if (data.users.length > 3) {
    return 'Too many different user accounts from this device';
  }
  
  return 'Suspicious activity detected';
};

/**
 * Get all device fingerprints for admin purposes
 * @param limit - The maximum number of devices to return
 * @returns A promise that resolves with an array of device data
 */
export const getDeviceFingerprints = async (limitCount: number = 100): Promise<any[]> => {
  if (USE_MOCK_FIREBASE) {
    // Mock implementation
    return Array.from(mockDeviceFingerprints.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, limitCount);
  }
  
  try {
    const devicesQuery = query(
      collection(db, DEVICE_FINGERPRINTS_COLLECTION),
      orderBy('lastSeen', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(devicesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

/**
 * Reset the mock device fingerprints (for testing)
 */
export const resetMockDeviceFingerprints = (): void => {
  mockDeviceFingerprints.clear();
}; 