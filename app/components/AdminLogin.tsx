import React, { useState, useRef } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { ArrowRight, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const { 
    isLoading, 
    error, 
    phoneNumber, 
    setPhoneNumber, 
    sendAdminOTP, 
    verifyAdminOTP 
  } = useAdminAuth();
  
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '']);
  const [buttonError, setButtonError] = useState<boolean>(false);
  const [buttonSuccess, setButtonSuccess] = useState<boolean>(false);
  
  // Refs for OTP inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  
  // Format phone number (US format)
  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    
    const digits = value.replace(/\D/g, '');
    
    if (digits.length < 4) return digits;
    if (digits.length < 7) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };
  
  // Handle phone input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedPhone);
    setButtonError(false);
  };
  
  // Handle send OTP
  const handleSendOTP = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
      return;
    }
    
    const success = await sendAdminOTP();
    
    if (success) {
      setOtpSent(true);
      setButtonSuccess(true);
      setTimeout(() => setButtonSuccess(false), 3000);
    } else {
      setButtonError(true);
      setTimeout(() => setButtonError(false), 3000);
    }
  };
  
  // Handle OTP input change
  const handleOtpChange = (index: number, value: string): void => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // If all digits are filled, verify OTP
    if (newOtpValues.every(v => v) && newOtpValues.join('').length === 4) {
      handleVerifyOTP(newOtpValues.join(''));
    }
  };
  
  // Handle key down in OTP input
  const handleKeyDown = (index: number, e: React.KeyboardEvent): void => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };
  
  // Verify OTP
  const handleVerifyOTP = async (otp: string): Promise<void> => {
    const success = await verifyAdminOTP(otp);
    
    if (!success) {
      setButtonError(true);
      setOtpValues(['', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }
      setTimeout(() => setButtonError(false), 3000);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Admin Authentication</h1>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        {!otpSent ? (
          // Phone input
          <form className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+1-323-244-9265"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only authorized admin phone numbers can access this page
              </p>
            </div>
            
            <div>
              <button
                onClick={handleSendOTP}
                disabled={isLoading}
                className={`w-full flex items-center justify-center p-2 rounded transition-colors ${
                  buttonError 
                    ? 'bg-red-500 text-white' 
                    : buttonSuccess 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isLoading ? (
                  <Loader size={20} className="animate-spin" />
                ) : buttonError ? (
                  <AlertCircle size={20} />
                ) : buttonSuccess ? (
                  <CheckCircle size={20} />
                ) : (
                  <>
                    Send OTP <ArrowRight size={16} className="ml-2" />
                  </>
                )}
              </button>
            </div>
            
            {/* reCAPTCHA container */}
            <div id="admin-recaptcha-container" className="invisible"></div>
          </form>
        ) : (
          // OTP verification
          <div className="space-y-4">
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
                  }}
                  type="text"
                  maxLength={1}
                  value={otpValues[index]}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`OTP digit ${index + 1}`}
                  disabled={isLoading}
                />
              ))}
            </div>
            
            {isLoading && (
              <div className="flex justify-center">
                <Loader size={24} className="animate-spin text-blue-500" />
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={() => setOtpSent(false)}
                className="text-blue-500 hover:text-blue-700 text-sm"
                disabled={isLoading}
              >
                Use a different phone number
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin; 