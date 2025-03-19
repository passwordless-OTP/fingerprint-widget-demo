import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  sendOTP, 
  verifyOTP, 
  initRecaptchaVerifier,
  getCurrentUser,
  signOutUser
} from '../lib/firebase.service';

// Define the admin phone number
const ADMIN_PHONE_NUMBER = '+1-323-244-9265';
const NORMALIZED_ADMIN_PHONE = ADMIN_PHONE_NUMBER.replace(/\D/g, '');

// Define the context type
interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  sendAdminOTP: () => Promise<boolean>;
  verifyAdminOTP: (otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  confirmationResult: any;
}

// Create the context with default values
const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  error: null,
  phoneNumber: '',
  setPhoneNumber: () => {},
  sendAdminOTP: async () => false,
  verifyAdminOTP: async () => false,
  logout: async () => {},
  confirmationResult: null,
});

// Create a provider component
export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // Check if the user's phone number matches the admin phone number
          const userPhone = user.phoneNumber?.replace(/\D/g, '');
          if (userPhone === NORMALIZED_ADMIN_PHONE) {
            setIsAuthenticated(true);
          } else {
            // If the user is logged in but not an admin, log them out
            await signOutUser();
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initRecaptchaVerifier('admin-recaptcha-container');
    }
  }, []);

  // Send OTP to admin phone number
  const sendAdminOTP = async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      // Normalize and validate the phone number
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      const normalizedAdminPhone = NORMALIZED_ADMIN_PHONE;

      // Check if the phone number matches the admin phone number
      if (normalizedPhone !== normalizedAdminPhone) {
        setError('Unauthorized phone number');
        return false;
      }

      // Send OTP
      const result = await sendOTP(phoneNumber);
      
      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        return true;
      } else {
        setError(result.error && typeof result.error === 'object' && 'message' in result.error 
          ? result.error.message as string 
          : 'Failed to send OTP');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP for admin authentication
  const verifyAdminOTP = async (otp: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      if (!confirmationResult) {
        setError('Session expired. Please request a new OTP.');
        return false;
      }

      const result = await verifyOTP(confirmationResult, otp, phoneNumber);
      
      if (result.success) {
        // Verify again that the authenticated user has the admin phone number
        const user = await getCurrentUser();
        const userPhone = user?.phoneNumber?.replace(/\D/g, '');
        
        if (userPhone === NORMALIZED_ADMIN_PHONE) {
          setIsAuthenticated(true);
          return true;
        } else {
          setError('Authenticated user is not an admin');
          await signOutUser();
          setIsAuthenticated(false);
          return false;
        }
      } else {
        setError(result.error && typeof result.error === 'object' && 'message' in result.error 
          ? result.error.message as string 
          : 'Invalid OTP code');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await signOutUser();
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    isLoading,
    error,
    phoneNumber,
    setPhoneNumber,
    sendAdminOTP,
    verifyAdminOTP,
    logout,
    confirmationResult,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Custom hook to use the admin auth context
export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}; 