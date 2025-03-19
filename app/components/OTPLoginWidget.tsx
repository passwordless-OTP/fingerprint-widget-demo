import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  initRecaptchaVerifier, 
  sendOTP, 
  verifyOTP, 
  isPhoneNumberBlocked,
  isPhoneNumberAllowed
} from '../lib/firebase.service';

// Add type declaration for window object
declare global {
  interface Window {
    recaptchaVerifierInitialized?: boolean;
  }
}

interface PhoneFormat {
  example: string;
  minLength: number;
}

interface PhoneFormats {
  [key: string]: PhoneFormat;
}

const OTPLoginWidget: React.FC = () => {
  // Base states
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [buttonError, setButtonError] = useState<boolean>(false);
  const [buttonSuccess, setButtonSuccess] = useState<boolean>(false);
  const [boxInverted, setBoxInverted] = useState<boolean>(false);
  const [showChatBubble, setShowChatBubble] = useState<boolean>(false);
  
  // Phone validation
  const [countryCode, setCountryCode] = useState<string>('US');
  const [phoneValid, setPhoneValid] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  
  // Firebase confirmation result
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Refs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  
  // Phone formats
  const phoneFormats: PhoneFormats = {
    'US': {
      example: '(555) 123-4567',
      minLength: 10
    },
    'UK': {
      example: '07911 123456',
      minLength: 11
    },
    'IN': {
      example: '98765 43210',
      minLength: 10
    }
  };
  
  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    if (recaptchaContainerRef.current) {
      initRecaptchaVerifier('recaptcha-container');
    }
  }, []);
  
  // Format phone number (US format as default)
  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    
    const digits = value.replace(/\D/g, '');
    
    if (countryCode === 'US') {
      if (digits.length < 4) return digits;
      if (digits.length < 7) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      }
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (countryCode === 'UK') {
      if (digits.length < 6) return digits;
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    } else if (countryCode === 'IN') {
      if (digits.length < 6) return digits;
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    
    return digits;
  };
  
  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    if (!phone) {
      setPhoneValid(false);
      setValidationMessage('Phone number required');
      return false;
    }
    
    const digits = phone.replace(/\D/g, '');
    const format = phoneFormats[countryCode as keyof PhoneFormats] || phoneFormats.US;
    
    // Check for repeated digits
    if (/^(.)\1+$/.test(digits)) {
      setPhoneValid(false);
      setValidationMessage('Invalid number');
      return false;
    }
    
    // Length check
    if (digits.length < format.minLength) {
      setPhoneValid(false);
      setValidationMessage('Number too short');
      return false;
    }
    
    setPhoneValid(true);
    setValidationMessage('Valid');
    return true;
  };
  
  // Handle phone input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedPhone);
    validatePhone(formattedPhone);
    setButtonError(false);
    setError('');
  };
  
  // Handle send OTP
  const handleSendOTP = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!validatePhone(phoneNumber)) {
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Initialize reCAPTCHA if not already done
      if (recaptchaContainerRef.current && !window.recaptchaVerifierInitialized) {
        initRecaptchaVerifier('recaptcha-container');
        window.recaptchaVerifierInitialized = true;
      }
      
      // Check if phone is allowed
      const isAllowed = await isPhoneNumberAllowed(phoneNumber);
      if (!isAllowed) {
        setError('This phone number is not in the allow list');
        setButtonError(true);
        setIsLoading(false);
        setTimeout(() => setButtonError(false), 3000);
        return;
      }
      
      // Check if phone is blocked
      const isBlocked = await isPhoneNumberBlocked(phoneNumber);
      if (isBlocked) {
        setError('This phone number is blocked');
        setButtonError(true);
        setIsLoading(false);
        setTimeout(() => setButtonError(false), 3000);
        return;
      }
      
      // Send OTP
      const result = await sendOTP(phoneNumber);
      
      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setOtpSent(true);
        setButtonSuccess(true);
        setTimeout(() => setButtonSuccess(false), 3000);
      } else {
        // Handle error with proper type checking
        let errorMessage = 'Failed to send OTP';
        if (result.error && typeof result.error === 'object' && 'message' in result.error) {
          errorMessage = result.error.message as string;
        }
        setError(errorMessage);
        setButtonError(true);
        setTimeout(() => setButtonError(false), 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OTP input
  const handleOtpChange = (index: number, value: string): void => {
    // Only allow digits
    const newValue = value.replace(/\D/g, '');
    
    // Update the OTP array
    const newOtpValues = [...otpValues];
    newOtpValues[index] = newValue;
    setOtpValues(newOtpValues);
    
    // Auto-focus next input if value is entered
    if (newValue && index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // If all fields are filled, verify automatically
    if (newOtpValues.every(val => val) && newOtpValues.join('').length === 4) {
      handleVerifyOTP(newOtpValues.join(''));
    }
  };
  
  // Handle backspace in OTP fields
  const handleKeyDown = (index: number, e: React.KeyboardEvent): void => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };
  
  // Verify OTP code
  const handleVerifyOTP = async (otp: string): Promise<void> => {
    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await verifyOTP(confirmationResult, otp, phoneNumber);
      
      if (result.success) {
        setSuccess(true);
        setButtonSuccess(true);
      } else {
        // Check if the number was temporarily blocked
        if (result.tempBlocked) {
          setError(result.error?.message || 'Too many failed attempts. Your number has been temporarily blocked.');
          // Return to phone input screen
          setOtpSent(false);
        } else {
          setError('Invalid OTP code. Please try again.');
        }
        
        setButtonError(true);
        setOtpValues(['', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0]?.focus();
        }
        setTimeout(() => setButtonError(false), 3000);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('An error occurred. Please try again.');
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle box color
  const handleBoxClick = (e: React.MouseEvent): void => {
    if (!e.detail || e.detail === 1) {
      setBoxInverted(!boxInverted);
    }
  };
  
  // Show chat bubble
  const showEmailBubble = (): void => {
    setShowChatBubble(true);
    setTimeout(() => {
      setShowChatBubble(false);
    }, 5000);
  };
  
  // Add double click handler
  useEffect(() => {
    const handleDoubleClick = (): void => {
      showEmailBubble();
    };
    
    document.addEventListener('dblclick', handleDoubleClick);
    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);
  
  // Detect user location (simulation)
  useEffect(() => {
    const locations = ['US', 'UK', 'IN'];
    const detected = locations[Math.floor(Math.random() * locations.length)];
    setCountryCode(detected);
  }, []);
  
  return (
    <div className="w-full max-w-sm">
      {/* Chat bubble */}
      {showChatBubble && (
        <div className="absolute top-1/2 right-1/3 transform -translate-y-full -translate-x-1/4 bg-white rounded-lg p-3 shadow-lg z-50 border border-gray-200">
          <div className="font-medium">Need help? Contact us</div>
          <div className="text-sm text-gray-600">support@example.com</div>
          <div className="absolute bottom-0 left-1/4 transform translate-y-1/2 rotate-45 w-4 h-4 bg-white border-r border-b border-gray-200"></div>
        </div>
      )}
      
      {/* Main widget */}
      <div 
        id="login-widget-container"
        className="w-full rounded-full bg-white bg-opacity-50 backdrop-blur-sm shadow-lg overflow-hidden transition-all duration-300 relative"
      >
        <div className="px-4 py-3">
          {success ? (
            // Success state
            <div className="py-6 px-4 flex flex-col items-center text-center">
              <div className="mb-4 text-green-500" data-testid="success-icon">
                <CheckCircle size={48} />
              </div>
              <div className="text-lg font-medium">Authentication Successful</div>
              <div className="text-sm text-gray-600 mt-2">You are now logged in</div>
            </div>
          ) : (
            <>
              {!otpSent ? (
                // Phone input
                <div className="animate-fadeIn">
                  <div className="flex items-center">
                    <div 
                      className={`relative p-1 rounded-full transition-all duration-300 w-full ${boxInverted ? 'bg-black' : 'bg-white'}`}
                      onClick={handleBoxClick}
                    >
                      <input
                        id="phone-input"
                        type="tel"
                        placeholder={phoneFormats[countryCode as keyof PhoneFormats]?.example || "(555) 123-4567"}
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        className={`w-full py-2 pl-3 pr-14 border ${phoneValid ? 'border-green-500' : 'border-black'} rounded-full focus:outline-none focus:ring-2 ${phoneValid ? 'focus:ring-green-500' : 'focus:ring-black'} focus:border-transparent transition-all ${boxInverted ? 'bg-black text-white border-white' : 'bg-white text-black'}`}
                        aria-label="Phone number"
                      />
                      <button
                        onClick={handleSendOTP}
                        disabled={isLoading}
                        className={`absolute right-0 top-1 h-10 w-10 
                          ${buttonError ? 'bg-red-500' : 
                            buttonSuccess ? 'bg-green-500' : 
                            boxInverted ? 'bg-white text-black' : 'bg-black text-white'} 
                          rounded-full flex items-center justify-center transition-all 
                          hover:opacity-90 active:scale-95 active:shadow-inner
                          focus:outline-none focus:ring-2 focus:ring-offset-2 
                          ${buttonError ? 'focus:ring-red-500' : 
                            buttonSuccess ? 'focus:ring-green-500' : 'focus:ring-black'} 
                          disabled:opacity-50 z-10`}
                        aria-label="Send verification code"
                      >
                        {isLoading ? (
                          <Loader size={20} className="animate-spin" />
                        ) : buttonError ? (
                          <AlertCircle size={20} />
                        ) : buttonSuccess ? (
                          <CheckCircle size={20} />
                        ) : (
                          <ArrowRight size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Validation message */}
                  {(validationMessage && !phoneValid && validationMessage !== 'Valid') || error ? (
                    <div className="text-xs mb-2 text-red-500 px-3">
                      {error || validationMessage}
                    </div>
                  ) : null}
                  
                  {/* Hidden reCAPTCHA container */}
                  <div id="recaptcha-container" ref={recaptchaContainerRef} className="invisible"></div>
                </div>
              ) : (
                // OTP verification
                <div className="animate-fadeIn">
                  <div className="text-center mb-3">
                    <div className="text-sm">Enter verification code sent to</div>
                    <div className="font-medium">{phoneNumber}</div>
                  </div>
                  
                  <div className="flex justify-center space-x-2 mb-4">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        ref={(el: HTMLInputElement | null) => {
                          inputRefs.current[index] = el;
                          return undefined;
                        }}
                        type="text"
                        maxLength={1}
                        value={otpValues[index]}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 text-center text-xl border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white text-black"
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>
                  
                  {error && (
                    <div className="text-xs mb-2 text-center text-red-500">
                      {error}
                    </div>
                  )}
                  
                  {isLoading && (
                    <div className="flex justify-center">
                      <Loader size={24} className="animate-spin text-black" />
                    </div>
                  )}
                  
                  <div className="text-center mt-3">
                    <button 
                      className="text-sm text-gray-600 hover:text-black transition-colors"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpValues(['', '', '', '']);
                        setError('');
                      }}
                    >
                      Change phone number
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        /* Custom contoured container styles */
        #login-widget-container {
          border-radius: 9999px;
          padding: 2px;
        }
        
        @media (min-width: 640px) {
          #login-widget-container {
            max-width: 360px;
          }
        }
      `}</style>
    </div>
  );
};

export default OTPLoginWidget; 