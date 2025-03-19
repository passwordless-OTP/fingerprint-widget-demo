// Mock Widget Script for Testing
(function() {
  // Create widget container
  function createWidget() {
    const container = document.getElementById('widget-container');
    if (!container) return;
    
    // Set container styles
    container.style.backgroundColor = 'white';
    container.style.border = '1px solid #ddd';
    container.style.borderRadius = '4px';
    container.style.padding = '20px';
    container.style.maxWidth = '400px';
    container.style.margin = '0 auto';
    container.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    
    // Create widget content
    let widgetContent = '';
    
    // Phone input section
    widgetContent += `
      <div id="phone-section">
        <h3 style="margin-top: 0;">Login with Phone</h3>
        <div style="margin-bottom: 15px;">
          <label for="phone-input" style="display: block; margin-bottom: 5px;">Phone Number</label>
          <input type="tel" id="phone-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter your phone number">
        </div>
        <button id="send-otp-button" style="background-color: #4285F4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%;">Send OTP</button>
      </div>
    `;
    
    // OTP verification section (hidden initially)
    widgetContent += `
      <div id="otp-section" style="display: none;">
        <h3 style="margin-top: 0;">Enter Verification Code</h3>
        <p>We sent a code to your phone. Please enter it below.</p>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <input type="text" class="otp-input" maxlength="1" style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="text" class="otp-input" maxlength="1" style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="text" class="otp-input" maxlength="1" style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="text" class="otp-input" maxlength="1" style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="display: flex; justify-content: space-between;">
          <button id="back-button" style="background-color: #f1f1f1; color: #333; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 48%;">Back</button>
          <button id="verify-button" style="background-color: #4285F4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 48%;">Verify</button>
        </div>
        <p id="error-message" style="color: red; display: none;">Invalid verification code. Please try again.</p>
      </div>
    `;
    
    // Success section (hidden initially)
    widgetContent += `
      <div id="success-section" style="display: none; text-align: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <h3>Successfully Verified</h3>
        <p>Your phone number has been verified successfully.</p>
        <button id="done-button" style="background-color: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; width: 100%;">Done</button>
      </div>
    `;
    
    // Set widget content
    container.innerHTML = widgetContent;
    
    // Add event listeners
    setupEventListeners();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Send OTP button
    const sendOtpButton = document.getElementById('send-otp-button');
    if (sendOtpButton) {
      sendOtpButton.addEventListener('click', function() {
        const phoneInput = document.getElementById('phone-input');
        if (phoneInput && phoneInput.value.trim() !== '') {
          document.getElementById('phone-section').style.display = 'none';
          document.getElementById('otp-section').style.display = 'block';
        }
      });
    }
    
    // Back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', function() {
        document.getElementById('otp-section').style.display = 'none';
        document.getElementById('phone-section').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        
        // Clear OTP inputs
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach(input => {
          input.value = '';
        });
      });
    }
    
    // Verify button
    const verifyButton = document.getElementById('verify-button');
    if (verifyButton) {
      verifyButton.addEventListener('click', function() {
        const otpInputs = document.querySelectorAll('.otp-input');
        let otp = '';
        otpInputs.forEach(input => {
          otp += input.value;
        });
        
        // For testing, accept "1234" as valid OTP
        if (otp === '1234') {
          document.getElementById('otp-section').style.display = 'none';
          document.getElementById('success-section').style.display = 'block';
        } else {
          document.getElementById('error-message').style.display = 'block';
        }
      });
    }
    
    // Done button
    const doneButton = document.getElementById('done-button');
    if (doneButton) {
      doneButton.addEventListener('click', function() {
        document.getElementById('success-section').style.display = 'none';
        document.getElementById('phone-section').style.display = 'block';
        
        // Clear inputs
        document.getElementById('phone-input').value = '';
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach(input => {
          input.value = '';
        });
      });
    }
    
    // OTP input handling
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
      // Focus next input when a digit is entered
      input.addEventListener('input', function() {
        if (this.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });
      
      // Handle backspace
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });
  }
  
  // Initialize widget when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})(); 