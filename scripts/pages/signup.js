// sign_up.js - Complete working version

let currentStep = 1;
let selectedAccountType = 'breeder';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sign up page loaded');
    
    // Initialize any existing values
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('emailAddress');
    
    if (fullNameInput && fullNameInput.value === '') {
        fullNameInput.value = '';
    }
    if (emailInput && emailInput.value === '') {
        emailInput.value = '';
    }
});

function nextStep(step) {
    if (step === 2) {
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('emailAddress').value;
        const phone = document.getElementById('phone').value;
        
        if (!name || !name.trim()) {
            showToast('Please enter your full name', 'error');
            return;
        }
        if (!email || !email.trim()) {
            showToast('Please enter your email address', 'error');
            return;
        }
        if (!Validators.email(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
    }

    // Hide current step
    const currentFormStep = document.getElementById(`formStep${currentStep}`);
    if (currentFormStep) {
        currentFormStep.classList.remove('active');
    }
    
    // Show new step
    const newFormStep = document.getElementById(`formStep${step}`);
    if (newFormStep) {
        newFormStep.classList.add('active');
    }
    
    // Update step indicators
    const currentStepIndicator = document.getElementById(`step${currentStep}`);
    const newStepIndicator = document.getElementById(`step${step}`);
    
    if (currentStepIndicator) {
        currentStepIndicator.classList.remove('active');
        currentStepIndicator.classList.add('completed');
    }
    if (newStepIndicator) {
        newStepIndicator.classList.add('active');
    }
    
    // Update progress bar
    const progress = ((step - 1) / 2) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // Update header text
    const texts = ['', "Let's start with the basics", 'What describes you best?', 'Secure your account'];
    const stepText = document.getElementById('stepText');
    if (stepText) {
        stepText.textContent = texts[step];
    }
    
    currentStep = step;
}

function prevStep(step) {
    // Hide current step
    const currentFormStep = document.getElementById(`formStep${currentStep}`);
    if (currentFormStep) {
        currentFormStep.classList.remove('active');
    }
    
    // Show previous step
    const prevFormStep = document.getElementById(`formStep${step}`);
    if (prevFormStep) {
        prevFormStep.classList.add('active');
    }
    
    // Update step indicators
    const currentStepIndicator = document.getElementById(`step${currentStep}`);
    const prevStepIndicator = document.getElementById(`step${step}`);
    
    if (currentStepIndicator) {
        currentStepIndicator.classList.remove('active');
    }
    if (prevStepIndicator) {
        prevStepIndicator.classList.remove('completed');
        prevStepIndicator.classList.add('active');
    }
    
    // Update progress bar
    const progress = ((step - 1) / 2) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // Update header text
    const texts = ['', "Let's start with the basics", 'What describes you best?', 'Secure your account'];
    const stepText = document.getElementById('stepText');
    if (stepText) {
        stepText.textContent = texts[step];
    }
    
    currentStep = step;
}

function selectType(element, type) {
    // Remove selected class from all account types
    const accountTypes = document.querySelectorAll('.account-type');
    accountTypes.forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected class to clicked element
    element.classList.add('selected');
    selectedAccountType = type;
    
    console.log('Selected account type:', selectedAccountType);
}

function validatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

// Main create account function
async function createAccount() {
    console.log('createAccount function called');
    
    // Get form values
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('emailAddress').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    console.log('Form values:', { name, email, phone, accountType: selectedAccountType });
    
    // Validation
    if (!name) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (typeof Validators !== 'undefined' && !Validators.email(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!password) {
        showToast('Please create a password', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!terms) {
        showToast('Please accept the Terms of Service', 'error');
        return;
    }
    
    const btn = document.getElementById('createBtn');
    if (btn) {
        btn.textContent = 'Creating account...';
        btn.disabled = true;
    }
    
    try {
        // Check if User object exists
        if (typeof User === 'undefined') {
            throw new Error('Authentication system not loaded. Please refresh the page.');
        }
        
        if (typeof User.signup !== 'function') {
            throw new Error('Signup function not available. Please refresh the page.');
        }
        
        console.log('Calling User.signup...');
        
        const result = await User.signup({
            name: name,
            email: email,
            password: password,
            accountType: selectedAccountType,
            phone: phone
        });
        
        // OTP flow — Supabase sent a 6-digit code to the user's email
        if (result && result.__awaitingOtp) {
            showToast(`Check your email for a 6-digit verification code! 📧`, 'success');
            
            const formStep3 = document.getElementById('formStep3');
            const progressBar = document.querySelector('.progress-bar');
            const signupHeader = document.querySelector('.signup-header');
            const logoContainer = document.querySelector('.logo-container');
            const loginLink = document.querySelector('.login-link');
            const successState = document.getElementById('successState');
            
            if (formStep3) formStep3.classList.remove('active');
            if (progressBar) progressBar.style.display = 'none';
            if (signupHeader) signupHeader.style.display = 'none';
            if (logoContainer) logoContainer.style.display = 'none';
            if (loginLink) loginLink.style.display = 'none';
            if (successState) successState.classList.add('active');
            
            setTimeout(() => { window.location.href = 'verify-otp.html'; }, 1200);
            return;
        }

        console.log('Signup response:', result);
        
        // Already verified (e.g. email confirmations disabled in Supabase)
        showToast(`Welcome to BreedLink, ${result.name || name}! 🎉`, 'success');
        
        // Hide the form and show success state
        const formStep3 = document.getElementById('formStep3');
        const progressBar = document.querySelector('.progress-bar');
        const signupHeader = document.querySelector('.signup-header');
        const logoContainer = document.querySelector('.logo-container');
        const successState = document.getElementById('successState');
        const loginLink = document.querySelector('.login-link');
        
        if (formStep3) formStep3.classList.remove('active');
        if (progressBar) progressBar.style.display = 'none';
        if (signupHeader) signupHeader.style.display = 'none';
        if (logoContainer) logoContainer.style.display = 'none';
        if (loginLink) loginLink.style.display = 'none';
        if (successState) successState.classList.add('active');
        
        // Redirect to profile page after 2 seconds
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
        
    } catch (error) {
        console.error('Signup error:', error);
        
        // Show specific error messages
        let errorMessage = error.message || 'Account creation failed. Please try again.';
        
        if (errorMessage.toLowerCase().includes('already registered') || errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('already in use')) {
            errorMessage = 'This email is already registered. Please sign in instead.';
            showToast(errorMessage, 'error');
            setTimeout(() => showToast('Already have an account? → Sign In below', 'info'), 2500);
        } else if (errorMessage.toLowerCase().includes('password')) {
            errorMessage = 'Password must be at least 8 characters with letters and numbers.';
            showToast(errorMessage, 'error');
        } else if (errorMessage.toLowerCase().includes('rate_limit') || errorMessage.toLowerCase().includes('too many')) {
            errorMessage = 'Too many attempts. Please wait a minute and try again.';
            showToast(errorMessage, 'error');
        } else {
            showToast(errorMessage, 'error');
        }
        
        // Reset button
        if (btn) {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    }
}

// Helper function to toggle password visibility (if not already defined in auth.js)

// Make sure showToast is available (fallback)

// Make sure Validators is available (fallback)

// Log that script is loaded
console.log('sign_up.js loaded successfully');
