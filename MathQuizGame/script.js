// Toast Notification Function
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Route Protection: Redirect if already logged in
if (DataService.getCurrentUser()) {
    window.location.replace('dashboard.html');
}

// Form sections
const signInSection = document.getElementById('signInSection');
const signUpSection = document.getElementById('signUpSection');
const showSignUpLink = document.getElementById('showSignUp');
const showSignInLink = document.getElementById('showSignIn');

// Persists auth mode
function setAuthMode(mode) {
    if (mode === 'signup') {
        signInSection.classList.remove('active');
        signUpSection.classList.add('active');
    } else {
        signUpSection.classList.remove('active');
        signInSection.classList.add('active');
    }
    localStorage.setItem('auth_mode', mode);
}

// Toggle to Sign Up
showSignUpLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('signup');
});

// Toggle to Sign In
showSignInLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('login');
});

// Restore auth mode on load
const savedMode = localStorage.getItem('auth_mode');
if (savedMode) {
    setAuthMode(savedMode);
}

// Helper: Show error on inputs
// Helper: Show error on inputs
function showError(inputs, message) {
    const errorDisplay = document.getElementById('loginErrorMessage');
    if (errorDisplay && message) {
        errorDisplay.textContent = message;
    }

    inputs.forEach(input => {
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('error');

        // Remove error on input
        input.addEventListener('input', () => {
            wrapper.classList.remove('error');
            if (errorDisplay) errorDisplay.textContent = '';
        }, { once: true });
    });
}

// Sign In form validation
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError([usernameInput, passwordInput], 'Please fill in all fields');
        return;
    }

    const result = DataService.loginUser(username, password);

    if (result.success) {
        // Success - Clear any previous user's UI state
        localStorage.removeItem('currentSection');
        localStorage.removeItem('mathQuizState');
        window.location.replace('dashboard.html');
    } else {
        // Show error on inputs instead of toast
        showError([usernameInput, passwordInput], 'Invalid username or password');
    }
});

// Helper: Show error on signup inputs
function showSignupError(inputs, message) {
    const errorDisplay = document.getElementById('signupErrorMessage');
    if (errorDisplay && message) {
        errorDisplay.textContent = message;
    }

    inputs.forEach(input => {
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('error');

        // Remove error on input
        input.addEventListener('input', () => {
            wrapper.classList.remove('error');
            if (errorDisplay) errorDisplay.textContent = '';
        }, { once: true });
    });
}

// Sign Up form validation
const signupForm = document.getElementById('signupForm');
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('signupEmail');
    const usernameInput = document.getElementById('signupUsername');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !username || !password || !confirmPassword) {
        showSignupError([emailInput, usernameInput, passwordInput, confirmPasswordInput], 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showSignupError([passwordInput, confirmPasswordInput], 'Passwords do not match');
        return;
    }

    const newUser = {
        email,
        username,
        password
    };

    const result = DataService.saveUser(newUser);

    if (result.success) {
        showToast('Account created successfully! Please sign in.', 'success');
        loginForm.reset();
        signupForm.reset();
        // Switch to login view
        setAuthMode('login');
    } else {
        showSignupError([usernameInput, emailInput], result.message);
    }
});

