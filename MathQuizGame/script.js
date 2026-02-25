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
const showSignUpLink = document.getElementById('showSignUp');
const showSignInLink = document.getElementById('showSignIn');

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

showSignUpLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('signup');
});

showSignInLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('login');
});

const savedMode = localStorage.getItem('auth_mode');
if (savedMode) {
    setAuthMode(savedMode);
}

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