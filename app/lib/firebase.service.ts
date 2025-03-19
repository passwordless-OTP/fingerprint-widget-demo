import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { mockFirebase, MockUser } from './mocks/firebase.mock';

// Environment variable to control using mock or real Firebase
const USE_MOCK_FIREBASE = process.env.NEXT_PUBLIC_USE_MOCK_FIREBASE === 'true';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (only if using real Firebase)
let app;
let auth: Auth;
let db: Firestore;

if (!USE_MOCK_FIREBASE) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

// Collection names
const ALLOW_LIST_COLLECTION = 'allowList';
const BLOCK_LIST_COLLECTION = 'blockList';
const TEMP_BLOCK_COLLECTION = 'tempBlockList';

// Failed attempts tracking
interface FailedAttempt {
  timestamp: number;
  phoneNumber: string;
}

interface FailedAttemptsTracker {
  [phoneNumber: string]: FailedAttempt[];
}

// In-memory storage for failed attempts
const failedAttempts: FailedAttemptsTracker = {};

// Constants for auto-blocking
const MAX_FAILED_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 15 * 1000; // 15 seconds
const BLOCK_DURATION_MS = 60 * 1000; // 60 seconds

// RecaptchaVerifier instance
let recaptchaVerifier: RecaptchaVerifier | any = null;

/**
 * Initialize the reCAPTCHA verifier
 * @param containerId - The ID of the container element for reCAPTCHA
 */
export const initRecaptchaVerifier = (containerId: string) => {
  if (USE_MOCK_FIREBASE) {
    recaptchaVerifier = new mockFirebase.RecaptchaVerifier(null, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
    return;
  }

  if (typeof window !== 'undefined') {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }
};

/**
 * Record a failed OTP verification attempt and check if the number should be temporarily blocked
 * @param phoneNumber - The phone number that failed verification
 * @returns A promise that resolves with a boolean indicating if the number is now blocked
 */
export const recordFailedAttempt = async (phoneNumber: string): Promise<boolean> => {
  const normalizedNumber = normalizePhoneNumber(phoneNumber);
  const now = Date.now();
  
  // Initialize array if it doesn't exist
  if (!failedAttempts[normalizedNumber]) {
    failedAttempts[normalizedNumber] = [];
  }
  
  // Add the current attempt
  failedAttempts[normalizedNumber].push({
    timestamp: now,
    phoneNumber
  });
  
  // Filter attempts to only include those within the time window
  failedAttempts[normalizedNumber] = failedAttempts[normalizedNumber].filter(
    attempt => (now - attempt.timestamp) < ATTEMPT_WINDOW_MS
  );
  
  // Check if we've reached the threshold for blocking
  if (failedAttempts[normalizedNumber].length >= MAX_FAILED_ATTEMPTS) {
    // Block the number temporarily
    await addToTempBlockList(phoneNumber);
    
    // Clear the attempts for this number
    failedAttempts[normalizedNumber] = [];
    
    // Schedule removal from block list after duration
    setTimeout(async () => {
      await removeFromTempBlockList(phoneNumber);
    }, BLOCK_DURATION_MS);
    
    return true;
  }
  
  return false;
};

/**
 * Add a phone number to the temporary block list
 * @param phoneNumber - The phone number to block temporarily
 * @returns A promise that resolves when the operation is complete
 */
export const addToTempBlockList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.addToTempBlockList(phoneNumber, BLOCK_DURATION_MS);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + BLOCK_DURATION_MS).toISOString();
    
    // Add the phone number to the temp block list
    await setDoc(doc(db, TEMP_BLOCK_COLLECTION, normalizedNumber), {
      phoneNumber,
      normalizedNumber,
      blockedAt: new Date().toISOString(),
      expiresAt,
      reason: 'Too many failed attempts'
    });
    
    return true;
  } catch (error) {
    console.error('Error adding to temp block list:', error);
    return false;
  }
};

/**
 * Remove a phone number from the temporary block list
 * @param phoneNumber - The phone number to unblock
 * @returns A promise that resolves when the operation is complete
 */
export const removeFromTempBlockList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.removeFromTempBlockList(phoneNumber);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Remove the phone number from the temp block list
    await deleteDoc(doc(db, TEMP_BLOCK_COLLECTION, normalizedNumber));
    
    return true;
  } catch (error) {
    console.error('Error removing from temp block list:', error);
    return false;
  }
};

/**
 * Check if a phone number is temporarily blocked
 * @param phoneNumber - The phone number to check
 * @returns A promise that resolves with a boolean indicating if the number is temporarily blocked
 */
export const isPhoneNumberTempBlocked = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.allowBlockList.isPhoneNumberTempBlocked(phoneNumber);
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if the phone number is in the temp block list
    const phoneDoc = doc(db, TEMP_BLOCK_COLLECTION, normalizedNumber);
    const phoneSnapshot = await getDoc(phoneDoc);
    
    if (!phoneSnapshot.exists()) {
      return false;
    }
    
    // Check if the block has expired
    const data = phoneSnapshot.data();
    const expiresAt = new Date(data.expiresAt).getTime();
    const now = Date.now();
    
    if (now > expiresAt) {
      // Block has expired, remove it
      await removeFromTempBlockList(phoneNumber);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking temp block list:', error);
    // Default to not blocking the number if there's an error
    return false;
  }
};

/**
 * Send OTP to the provided phone number
 * @param phoneNumber - The phone number to send OTP to
 * @returns A promise that resolves with the confirmation result
 */
export const sendOTP = async (phoneNumber: string) => {
  try {
    if (!recaptchaVerifier) {
      throw new Error('reCAPTCHA verifier not initialized');
    }
    
    // Check if phone number is blocked before sending OTP
    const isBlocked = await isPhoneNumberBlocked(phoneNumber);
    if (isBlocked) {
      return {
        success: false,
        error: new Error('Phone number is blocked')
      };
    }
    
    // Check if phone number is temporarily blocked
    const isTempBlocked = await isPhoneNumberTempBlocked(phoneNumber);
    if (isTempBlocked) {
      return {
        success: false,
        error: new Error('Phone number is temporarily blocked due to too many failed attempts. Please try again later.')
      };
    }
    
    // Check if phone number is allowed (if allow list is being used)
    const isAllowed = await isPhoneNumberAllowed(phoneNumber);
    if (!isAllowed) {
      return {
        success: false,
        error: new Error('Phone number is not in the allow list')
      };
    }
    
    let confirmationResult;
    
    if (USE_MOCK_FIREBASE) {
      confirmationResult = await mockFirebase.auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
    } else {
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    }
    
    return {
      success: true,
      confirmationResult
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      error
    };
  }
};

/**
 * Verify OTP code
 * @param confirmationResult - The confirmation result from sendOTP
 * @param code - The OTP code entered by the user
 * @param phoneNumber - The phone number being verified
 * @returns A promise that resolves with the user credential
 */
export const verifyOTP = async (confirmationResult: any, code: string, phoneNumber: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    // Record the failed attempt
    if (phoneNumber) {
      const isNowBlocked = await recordFailedAttempt(phoneNumber);
      if (isNowBlocked) {
        return {
          success: false,
          error: new Error('Too many failed attempts. Your number has been temporarily blocked for 60 seconds.'),
          tempBlocked: true
        };
      }
    }
    
    return {
      success: false,
      error
    };
  }
};

/**
 * Normalize a phone number for consistent storage and comparison
 * @param phoneNumber - The phone number to normalize
 * @returns The normalized phone number
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Check if a phone number is in the allow list
 * @param phoneNumber - The phone number to check
 * @returns A promise that resolves with a boolean indicating if the number is allowed
 */
export const isPhoneNumberAllowed = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.allowBlockList.isPhoneNumberAllowed(phoneNumber);
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if the allow list is empty (if empty, all numbers are allowed unless blocked)
    const allowListQuery = query(collection(db, ALLOW_LIST_COLLECTION));
    const allowListSnapshot = await getDocs(allowListQuery);
    
    if (allowListSnapshot.empty) {
      // If allow list is empty, check if the number is blocked
      return !(await isPhoneNumberBlocked(phoneNumber));
    }
    
    // Check if the phone number is in the allow list
    const phoneDoc = doc(db, ALLOW_LIST_COLLECTION, normalizedNumber);
    const phoneSnapshot = await getDoc(phoneDoc);
    
    return phoneSnapshot.exists();
  } catch (error) {
    console.error('Error checking allow list:', error);
    // Default to allowing the number if there's an error
    return true;
  }
};

/**
 * Check if a phone number is in the block list
 * @param phoneNumber - The phone number to check
 * @returns A promise that resolves with a boolean indicating if the number is blocked
 */
export const isPhoneNumberBlocked = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.allowBlockList.isPhoneNumberBlocked(phoneNumber);
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Check if the phone number is in the block list
    const phoneDoc = doc(db, BLOCK_LIST_COLLECTION, normalizedNumber);
    const phoneSnapshot = await getDoc(phoneDoc);
    
    return phoneSnapshot.exists();
  } catch (error) {
    console.error('Error checking block list:', error);
    // Default to not blocking the number if there's an error
    return false;
  }
};

/**
 * Add a phone number to the allow list
 * @param phoneNumber - The phone number to add
 * @returns A promise that resolves when the operation is complete
 */
export const addToAllowList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.addToAllowList(phoneNumber);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Add the phone number to the allow list
    await setDoc(doc(db, ALLOW_LIST_COLLECTION, normalizedNumber), {
      phoneNumber,
      normalizedNumber,
      addedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding to allow list:', error);
    return false;
  }
};

/**
 * Remove a phone number from the allow list
 * @param phoneNumber - The phone number to remove
 * @returns A promise that resolves when the operation is complete
 */
export const removeFromAllowList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.removeFromAllowList(phoneNumber);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Remove the phone number from the allow list
    await deleteDoc(doc(db, ALLOW_LIST_COLLECTION, normalizedNumber));
    
    return true;
  } catch (error) {
    console.error('Error removing from allow list:', error);
    return false;
  }
};

/**
 * Add a phone number to the block list
 * @param phoneNumber - The phone number to add
 * @returns A promise that resolves when the operation is complete
 */
export const addToBlockList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.addToBlockList(phoneNumber);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Add the phone number to the block list
    await setDoc(doc(db, BLOCK_LIST_COLLECTION, normalizedNumber), {
      phoneNumber,
      normalizedNumber,
      blockedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding to block list:', error);
    return false;
  }
};

/**
 * Remove a phone number from the block list
 * @param phoneNumber - The phone number to remove
 * @returns A promise that resolves when the operation is complete
 */
export const removeFromBlockList = async (phoneNumber: string): Promise<boolean> => {
  if (USE_MOCK_FIREBASE) {
    await mockFirebase.allowBlockList.removeFromBlockList(phoneNumber);
    return true;
  }
  
  try {
    // Normalize the phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Remove the phone number from the block list
    await deleteDoc(doc(db, BLOCK_LIST_COLLECTION, normalizedNumber));
    
    return true;
  } catch (error) {
    console.error('Error removing from block list:', error);
    return false;
  }
};

/**
 * Get all phone numbers in the allow list
 * @returns A promise that resolves with an array of phone numbers
 */
export const getAllowList = async (): Promise<string[]> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.allowBlockList.getAllowList();
  }
  
  try {
    const allowListQuery = query(collection(db, ALLOW_LIST_COLLECTION));
    const allowListSnapshot = await getDocs(allowListQuery);
    
    return allowListSnapshot.docs.map(doc => doc.data().phoneNumber);
  } catch (error) {
    console.error('Error getting allow list:', error);
    return [];
  }
};

/**
 * Get all phone numbers in the block list
 * @returns A promise that resolves with an array of phone numbers
 */
export const getBlockList = async (): Promise<string[]> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.allowBlockList.getBlockList();
  }
  
  try {
    const blockListQuery = query(collection(db, BLOCK_LIST_COLLECTION));
    const blockListSnapshot = await getDocs(blockListQuery);
    
    return blockListSnapshot.docs.map(doc => doc.data().phoneNumber);
  } catch (error) {
    console.error('Error getting block list:', error);
    return [];
  }
};

/**
 * Get the current authenticated user
 * @returns A promise that resolves with the current user or null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | MockUser | null> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.auth.currentUser;
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Sign out the current user
 * @returns A promise that resolves when the sign out is complete
 */
export const signOutUser = async (): Promise<void> => {
  if (USE_MOCK_FIREBASE) {
    return mockFirebase.auth.signOut();
  }
  
  return signOut(auth);
};

// Export auth and db for direct access if needed
export { 
  auth, 
  db,
  USE_MOCK_FIREBASE
}; 