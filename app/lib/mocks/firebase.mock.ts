import { EventEmitter } from 'events';

// Mock user type
export interface MockUser {
  uid: string;
  phoneNumber: string;
  displayName?: string;
  email?: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
}

// Mock confirmation result type
export interface MockConfirmationResult {
  verificationId: string;
  confirm: (code: string) => Promise<{ user: MockUser }>;
}

// Temporary block entry type
interface TempBlockEntry {
  phoneNumber: string;
  blockedAt: number;
  expiresAt: number;
  reason: string;
}

// User activity log entry type
export interface UserActivityLogEntry {
  timestamp: number;
  userId: string;
  phoneNumber: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'otp_sent' | 'otp_verified';
  details?: any;
}

// Mock database
const mockDatabase = {
  users: new Map<string, MockUser>(),
  allowList: new Set<string>(['(555) 123-4567', '+1234567890', '+447911123456', '+919876543210']),
  blockList: new Set<string>(['(555) 999-9999', '+1999999999']),
  tempBlockList: new Map<string, TempBlockEntry>(),
  otpCodes: new Map<string, string>(),
  userActivityLogs: new Array<UserActivityLogEntry>(),
};

// Configuration for mock features
export const mockConfig = {
  enableUserActivityLogging: false, // Binary switch for user activity logging
};

// Auth state emitter
const authStateEmitter = new EventEmitter();

// Default mock user
const createMockUser = (phoneNumber: string): MockUser => ({
  uid: `mock-uid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  phoneNumber,
  emailVerified: false,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
});

// User activity logging function
const logUserActivity = (
  userId: string, 
  phoneNumber: string, 
  action: UserActivityLogEntry['action'], 
  details?: any
) => {
  if (mockConfig.enableUserActivityLogging) {
    const logEntry: UserActivityLogEntry = {
      timestamp: Date.now(),
      userId,
      phoneNumber,
      action,
      details,
    };
    mockDatabase.userActivityLogs.push(logEntry);
    console.log(`[User Activity Log] ${action.toUpperCase()}: ${phoneNumber} (${userId})`, details || '');
  }
};

// Current user
let currentUser: MockUser | null = null;

// Mock RecaptchaVerifier
export class MockRecaptchaVerifier {
  private containerId: string;
  private params: any;

  constructor(auth: any, containerId: string, params: any) {
    this.containerId = containerId;
    this.params = params;
    console.log('Mock RecaptchaVerifier initialized');
  }

  render() {
    console.log('Mock RecaptchaVerifier rendered');
    return Promise.resolve('mock-recaptcha-token');
  }

  verify() {
    console.log('Mock RecaptchaVerifier verified');
    if (this.params?.callback) {
      this.params.callback();
    }
    return Promise.resolve('mock-recaptcha-token');
  }

  clear() {
    console.log('Mock RecaptchaVerifier cleared');
  }
}

// Mock Firebase Auth methods
export const mockAuth = {
  currentUser,
  
  // Sign in with phone number
  signInWithPhoneNumber: async (phoneNumber: string, recaptchaVerifier: any): Promise<MockConfirmationResult> => {
    console.log(`Mock: Sending OTP to ${phoneNumber}`);
    
    // Check if phone is in block list
    if (mockDatabase.blockList.has(phoneNumber)) {
      throw new Error('Phone number is blocked');
    }
    
    // Generate a verification ID
    const verificationId = `mock-verification-${Date.now()}`;
    
    // Store the OTP code (always 1234 for testing)
    mockDatabase.otpCodes.set(verificationId, '1234');
    
    // Log user activity
    logUserActivity('system', phoneNumber, 'otp_sent', { verificationId });
    
    // Return confirmation result
    return {
      verificationId,
      confirm: async (code: string) => {
        console.log(`Mock: Verifying OTP code ${code} for ${phoneNumber}`);
        
        // Check if code is correct
        const storedCode = mockDatabase.otpCodes.get(verificationId);
        if (code !== storedCode) {
          logUserActivity('system', phoneNumber, 'otp_verified', { success: false, reason: 'Invalid code' });
          throw new Error('Invalid verification code');
        }
        
        // Create or get user
        let user = Array.from(mockDatabase.users.values())
          .find(u => u.phoneNumber === phoneNumber);
        
        if (!user) {
          user = createMockUser(phoneNumber);
          mockDatabase.users.set(user.uid, user);
          logUserActivity(user.uid, phoneNumber, 'create', { isNewUser: true });
        }
        
        // Set current user
        currentUser = user;
        
        // Log login activity
        logUserActivity(user.uid, phoneNumber, 'login', { method: 'otp' });
        logUserActivity(user.uid, phoneNumber, 'otp_verified', { success: true });
        
        // Emit auth state change
        authStateEmitter.emit('authStateChanged', user);
        
        return { user };
      }
    };
  },
  
  // Sign out
  signOut: async () => {
    console.log('Mock: Signing out');
    if (currentUser) {
      logUserActivity(currentUser.uid, currentUser.phoneNumber, 'logout');
    }
    currentUser = null;
    authStateEmitter.emit('authStateChanged', null);
    return Promise.resolve();
  },
  
  // Get current user
  getCurrentUser: () => {
    return currentUser;
  },
  
  // Auth state observer
  onAuthStateChanged: (callback: (user: MockUser | null) => void) => {
    console.log('Mock: Setting up auth state observer');
    
    // Call immediately with current state
    callback(currentUser);
    
    // Set up listener
    authStateEmitter.on('authStateChanged', callback);
    
    // Return unsubscribe function
    return () => {
      authStateEmitter.off('authStateChanged', callback);
    };
  }
};

// Mock Firestore methods
export const mockFirestore = {
  // Collection reference
  collection: (path: string) => ({
    doc: (id: string) => ({
      get: async () => {
        let data = null;
        let exists = false;
        
        if (path === 'users' && mockDatabase.users.has(id)) {
          data = mockDatabase.users.get(id);
          exists = true;
          
          // Log read activity
          if (data) {
            logUserActivity(id, data.phoneNumber, 'read', { collection: path });
          }
        }
        
        return {
          exists,
          data: () => data,
          id,
        };
      },
      set: async (data: any) => {
        if (path === 'users') {
          const isNew = !mockDatabase.users.has(id);
          const userData = { ...data, uid: id };
          mockDatabase.users.set(id, userData);
          
          // Log create/update activity
          logUserActivity(id, userData.phoneNumber || 'unknown', isNew ? 'create' : 'update', { 
            collection: path,
            isNew,
            fields: Object.keys(data)
          });
        }
        return Promise.resolve();
      },
      update: async (data: any) => {
        if (path === 'users' && mockDatabase.users.has(id)) {
          const existingData = mockDatabase.users.get(id);
          const updatedData = { 
            ...existingData, 
            ...data 
          };
          mockDatabase.users.set(id, updatedData);
          
          // Log update activity
          logUserActivity(id, updatedData.phoneNumber, 'update', { 
            collection: path,
            fields: Object.keys(data)
          });
        }
        return Promise.resolve();
      },
      delete: async () => {
        if (path === 'users') {
          const userData = mockDatabase.users.get(id);
          if (userData) {
            // Log delete activity
            logUserActivity(id, userData.phoneNumber, 'delete', { collection: path });
            mockDatabase.users.delete(id);
          }
        }
        return Promise.resolve();
      },
    }),
    where: (field: string, operator: string, value: any) => ({
      get: async () => {
        let results: any[] = [];
        
        if (path === 'users') {
          if (field === 'phoneNumber' && operator === '==') {
            results = Array.from(mockDatabase.users.values())
              .filter(user => user.phoneNumber === value);
              
            // Log read activity for each result
            results.forEach(user => {
              logUserActivity(user.uid, user.phoneNumber, 'read', { 
                collection: path,
                query: { field, operator, value }
              });
            });
          }
        }
        
        return {
          empty: results.length === 0,
          docs: results.map(item => ({
            exists: true,
            data: () => item,
            id: item.uid,
          })),
        };
      },
    }),
    add: async (data: any) => {
      const id = `mock-doc-${Date.now()}`;
      if (path === 'users') {
        const userData = { ...data, uid: id };
        mockDatabase.users.set(id, userData);
        
        // Log create activity
        logUserActivity(id, userData.phoneNumber || 'unknown', 'create', { 
          collection: path,
          fields: Object.keys(data)
        });
      }
      return { id };
    },
  }),
};

// Mock allow/block list functionality
export const mockAllowBlockList = {
  isPhoneNumberAllowed: async (phoneNumber: string): Promise<boolean> => {
    // If the allow list is empty, all numbers are allowed unless blocked
    if (mockDatabase.allowList.size === 0) {
      return !mockDatabase.blockList.has(phoneNumber) && !mockDatabase.tempBlockList.has(phoneNumber);
    }
    
    // Otherwise, check if the number is in the allow list and not in any block list
    return mockDatabase.allowList.has(phoneNumber) && 
           !mockDatabase.blockList.has(phoneNumber) && 
           !mockDatabase.tempBlockList.has(phoneNumber);
  },
  
  isPhoneNumberBlocked: async (phoneNumber: string): Promise<boolean> => {
    return mockDatabase.blockList.has(phoneNumber);
  },
  
  isPhoneNumberTempBlocked: async (phoneNumber: string): Promise<boolean> => {
    // Check if the number is in the temp block list
    if (!mockDatabase.tempBlockList.has(phoneNumber)) {
      return false;
    }
    
    // Check if the block has expired
    const entry = mockDatabase.tempBlockList.get(phoneNumber);
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      // Block has expired, remove it
      mockDatabase.tempBlockList.delete(phoneNumber);
      return false;
    }
    
    return true;
  },
  
  addToAllowList: async (phoneNumber: string): Promise<void> => {
    mockDatabase.allowList.add(phoneNumber);
    return Promise.resolve();
  },
  
  removeFromAllowList: async (phoneNumber: string): Promise<void> => {
    mockDatabase.allowList.delete(phoneNumber);
    return Promise.resolve();
  },
  
  addToBlockList: async (phoneNumber: string): Promise<void> => {
    mockDatabase.blockList.add(phoneNumber);
    return Promise.resolve();
  },
  
  removeFromBlockList: async (phoneNumber: string): Promise<void> => {
    mockDatabase.blockList.delete(phoneNumber);
    return Promise.resolve();
  },
  
  addToTempBlockList: async (phoneNumber: string, durationMs: number): Promise<void> => {
    const now = Date.now();
    mockDatabase.tempBlockList.set(phoneNumber, {
      phoneNumber,
      blockedAt: now,
      expiresAt: now + durationMs,
      reason: 'Too many failed attempts'
    });
    
    // Auto-remove after duration
    setTimeout(() => {
      mockDatabase.tempBlockList.delete(phoneNumber);
    }, durationMs);
    
    return Promise.resolve();
  },
  
  removeFromTempBlockList: async (phoneNumber: string): Promise<void> => {
    mockDatabase.tempBlockList.delete(phoneNumber);
    return Promise.resolve();
  },
  
  getAllowList: async (): Promise<string[]> => {
    return Array.from(mockDatabase.allowList);
  },
  
  getBlockList: async (): Promise<string[]> => {
    return Array.from(mockDatabase.blockList);
  },
  
  getTempBlockList: async (): Promise<string[]> => {
    return Array.from(mockDatabase.tempBlockList.keys());
  }
};

// User activity logging functionality
export const mockUserActivity = {
  // Enable user activity logging
  enableLogging: () => {
    mockConfig.enableUserActivityLogging = true;
    console.log('User activity logging enabled');
  },
  
  // Disable user activity logging
  disableLogging: () => {
    mockConfig.enableUserActivityLogging = false;
    console.log('User activity logging disabled');
  },
  
  // Toggle user activity logging
  toggleLogging: () => {
    mockConfig.enableUserActivityLogging = !mockConfig.enableUserActivityLogging;
    console.log(`User activity logging ${mockConfig.enableUserActivityLogging ? 'enabled' : 'disabled'}`);
    return mockConfig.enableUserActivityLogging;
  },
  
  // Get current logging status
  isLoggingEnabled: () => mockConfig.enableUserActivityLogging,
  
  // Get all activity logs
  getLogs: () => [...mockDatabase.userActivityLogs],
  
  // Get logs for a specific user
  getUserLogs: (userId: string) => {
    return mockDatabase.userActivityLogs.filter(log => log.userId === userId);
  },
  
  // Get logs for a specific phone number
  getPhoneNumberLogs: (phoneNumber: string) => {
    return mockDatabase.userActivityLogs.filter(log => log.phoneNumber === phoneNumber);
  },
  
  // Get logs for a specific action
  getActionLogs: (action: UserActivityLogEntry['action']) => {
    return mockDatabase.userActivityLogs.filter(log => log.action === action);
  },
  
  // Clear all logs
  clearLogs: () => {
    mockDatabase.userActivityLogs = [];
    console.log('User activity logs cleared');
  }
};

// Utility to reset the mock database (useful for testing)
export const resetMockDatabase = () => {
  mockDatabase.users.clear();
  mockDatabase.allowList.clear();
  mockDatabase.blockList.clear();
  mockDatabase.tempBlockList.clear();
  mockDatabase.otpCodes.clear();
  mockDatabase.userActivityLogs = [];
  
  // Add default allowed numbers
  mockDatabase.allowList.add('(555) 123-4567');
  mockDatabase.allowList.add('+1234567890');
  mockDatabase.allowList.add('+447911123456');
  mockDatabase.allowList.add('+919876543210');
  
  // Add default blocked numbers
  mockDatabase.blockList.add('(555) 999-9999');
  mockDatabase.blockList.add('+1999999999');
  
  currentUser = null;
  authStateEmitter.removeAllListeners();
};

// Export mock Firebase
export const mockFirebase = {
  auth: mockAuth,
  firestore: mockFirestore,
  RecaptchaVerifier: MockRecaptchaVerifier,
  allowBlockList: mockAllowBlockList,
  userActivity: mockUserActivity,
  resetDatabase: resetMockDatabase,
  config: mockConfig
}; 