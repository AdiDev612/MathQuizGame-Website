function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;


    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

if (DataService.getCurrentUser()) {
    window.location.replace('dashboard.html');
}

const signInSection = document.getElementById('signInSection');
const signUpSection = document.getElementById('signUpSection');
const forgotSection = document.getElementById('forgotSection');
const showSignUpLink = document.getElementById('showSignUp');
const showSignInLink = document.getElementById('showSignIn');
const forgotLink = document.querySelector('.forgot-link');
const backToSignInLink = document.getElementById('backToSignIn');

function setAuthMode(mode) {
    if (mode === 'signup') {
        signInSection.classList.remove('active');
        signUpSection.classList.add('active');
        forgotSection.classList.remove('active');
    } else if (mode === 'forgot') {
        signInSection.classList.remove('active');
        signUpSection.classList.remove('active');
        forgotSection.classList.add('active');
    } else {
        signUpSection.classList.remove('active');
        forgotSection.classList.remove('active');
        signInSection.classList.add('active');
    }
    localStorage.setItem('auth_mode', mode);
}

showSignUpLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('signup');
});

showSignInLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('login');
});

if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode('forgot');
    });
}

if (backToSignInLink) {
    backToSignInLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode('login');
    });
}

const savedMode = localStorage.getItem('auth_mode');
if (savedMode) {
    setAuthMode(savedMode);
}

// Remember Me functionality
const REMEMBER_ME_KEY = 'math_quiz_remember_username';
const rememberCheckbox = document.getElementById('remember');
const usernameInput = document.getElementById('username');

// Load saved username on page load
function loadSavedUsername() {
    const savedUsername = localStorage.getItem(REMEMBER_ME_KEY);
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberCheckbox.checked = true;
    }
}

// Helper function to save username when remember me is checked
function saveUsername(username) {
    if (rememberCheckbox.checked) {
        localStorage.setItem(REMEMBER_ME_KEY, username);
    } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
    }
}

// Load saved username on page load
loadSavedUsername();

// Clear saved username when checkbox is unchecked
rememberCheckbox.addEventListener('change', (e) => {
    if (!e.target.checked) {
        localStorage.removeItem(REMEMBER_ME_KEY);
    }
});

function showError(inputs, message) {
    const errorDisplay = document.getElementById('loginErrorMessage');
    if (errorDisplay && message) {
        errorDisplay.textContent = message;
    }

    inputs.forEach(input => {
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('error');

        input.addEventListener('input', () => {
            wrapper.classList.remove('error');
            if (errorDisplay) errorDisplay.textContent = '';
        }, { once: true });
    });
}

const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError([usernameInput, passwordInput], 'Please fill in all fields');
        return;
    }

    const result = await DataService.loginUser(username, password);

    if (result.success) {
        // Save username if remember me is checked
        if (rememberCheckbox.checked) {
            saveUsername(username);
        } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
        }
        
        localStorage.removeItem('currentSection');
        localStorage.removeItem('mathQuizState');
        window.location.replace('dashboard.html');
    } else {
        showError([usernameInput, passwordInput], 'Invalid username or password');
    }
});

function showSignupError(inputs, message) {
    const errorDisplay = document.getElementById('signupErrorMessage');
    if (errorDisplay && message) {
        errorDisplay.textContent = message;
    }

    inputs.forEach(input => {
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('error');

        input.addEventListener('input', () => {
            wrapper.classList.remove('error');
            if (errorDisplay) errorDisplay.textContent = '';
        }, { once: true });
    });
}

const signupForm = document.getElementById('signupForm');
signupForm.addEventListener('submit', async (e) => {
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

    // Username length limits
    if (username.length < 3 || username.length > 20) {
        showSignupError([usernameInput], 'Username must be between 3 and 20 characters');
        return;
    }

    // Password length limits
    if (password.length < 8) {
        showSignupError([passwordInput, confirmPasswordInput], 'Password must be at least 8 characters long');
        return;
    }

    if (password.length > 32) {
        showSignupError([passwordInput, confirmPasswordInput], 'Password must be 32 characters or less');
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

    const result = await DataService.saveUser(newUser);

    if (result.success) {
        showToast('Account created successfully! Please sign in.', 'success');
        loginForm.reset();
        signupForm.reset();
        setAuthMode('login');
    } else {
        showSignupError([usernameInput, emailInput], result.message);
    }
});

// Forgot Password functionality
function showForgotError(inputs, message) {
    const errorDisplay = document.getElementById('forgotErrorMessage');
    if (errorDisplay && message) {
        errorDisplay.textContent = message;
    }

    inputs.forEach(input => {
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('error');

        input.addEventListener('input', () => {
            wrapper.classList.remove('error');
            if (errorDisplay) errorDisplay.textContent = '';
        }, { once: true });
    });
}

const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('forgotEmail');
        const newPasswordInput = document.getElementById('forgotNewPassword');
        const confirmPasswordInput = document.getElementById('forgotConfirmPassword');

        const email = emailInput.value.trim();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!email || !newPassword || !confirmPassword) {
            showForgotError([emailInput, newPasswordInput, confirmPasswordInput], 'Please fill in all fields');
            return;
        }

        if (newPassword.length < 8) {
            showForgotError([newPasswordInput, confirmPasswordInput], 'Password must be at least 8 characters long');
            return;
        }

        if (newPassword.length > 32) {
            showForgotError([newPasswordInput, confirmPasswordInput], 'Password must be 32 characters or less');
            return;
        }

        if (newPassword !== confirmPassword) {
            showForgotError([newPasswordInput, confirmPasswordInput], 'Passwords do not match');
            return;
        }

        const result = await DataService.resetPassword(email, newPassword);

        if (result.success) {
            showToast('Password reset successfully! Please sign in.', 'success');
            forgotForm.reset();
            setAuthMode('login');
        } else {
            showForgotError([emailInput], result.message);
        }
    });
}

// Show/hide password functionality
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
togglePasswordButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = 'Hide';
        } else {
            input.type = 'password';
            btn.textContent = 'Show';
        }
    });
});