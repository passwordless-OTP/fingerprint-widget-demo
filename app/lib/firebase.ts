import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  PhoneAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Phone authentication methods
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize the reCAPTCHA verifier
 * @param containerId - The ID of the container element for reCAPTCHA
 */
export const initRecaptchaVerifier = (containerId: string) => {
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
 * Send OTP to the provided phone number
 * @param phoneNumber - The phone number to send OTP to
 * @returns A promise that resolves with the confirmation result
 */
export const sendOTP = async (phoneNumber: string) => {
  try {
    if (!recaptchaVerifier) {
      throw new Error('reCAPTCHA verifier not initialized');
    }
    
    const confirmationResult = await signInWithPhoneNumber(
      auth, 
      phoneNumber, 
      recaptchaVerifier
    );
    
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
 * @returns A promise that resolves with the user credential
 */
export const verifyOTP = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error
    };
  }
};

/**
 * Check if a phone number is in the allow list
 * @param phoneNumber - The phone number to check
 * @returns A promise that resolves with a boolean indicating if the number is allowed
 */
export const isPhoneNumberAllowed = async (phoneNumber: string) => {
  // This would be implemented with Firestore rules or functions
  // For now, return true as a placeholder
  return true;
};

/**
 * Check if a phone number is in the block list
 * @param phoneNumber - The phone number to check
 * @returns A promise that resolves with a boolean indicating if the number is blocked
 */
export const isPhoneNumberBlocked = async (phoneNumber: string) => {
  // This would be implemented with Firestore rules or functions
  // For now, return false as a placeholder
  return false;
};

/**
 * Sign out the current user
 * @returns A promise that resolves when sign out is complete
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return {
      success: false,
      error
    };
  }
};

/**
 * Listen for auth state changes
 * @param callback - The callback to call when auth state changes
 * @returns An unsubscribe function
 */
export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, db }; 