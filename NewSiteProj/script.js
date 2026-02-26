// Supabase Configuration
const SUPABASE_URL = 'https://liezkfwoaqscaccdovcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZXprZndvYXFzY2FjY2RvdmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTM5OTgsImV4cCI6MjA4NzY2OTk5OH0.dZOe660pdzEJpwDuAWW6DMhRafi6GoXmO0bbwYRIg50';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to update authentication UI based on login status
async function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    
    try {
        // Check current Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error.message);
            const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
            updateAuthButton(authBtn, isLoggedIn);
            return;
        }
        
        const isLoggedIn = !!session;
        
        // Update localStorage to match Supabase session
        if (isLoggedIn && session.user) {
            localStorage.setItem('userLoggedIn', 'true');
            localStorage.setItem('userEmail', session.user.email || '');
            localStorage.setItem('userName', session.user.user_metadata?.name || session.user.email?.split('@')[0] || '');
        } else {
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
        }
        
        updateAuthButton(authBtn, isLoggedIn);
    } catch (error) {
        console.error('Error checking auth state:', error.message);
        const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        updateAuthButton(authBtn, isLoggedIn);
    }
}

// Helper function to update auth button
function updateAuthButton(authBtn, isLoggedIn) {
    if (authBtn) {
        if (isLoggedIn) {
            // Show user profile icon when logged in
            authBtn.innerHTML = '<i class="fa-regular fa-user"></i>';
            authBtn.className = 'icon-btn profile-btn';
            authBtn.title = 'Profile';
        } else {
            // Show Sign In button when not logged in
            authBtn.innerHTML = 'Sign In';
            authBtn.className = 'auth-btn';
            authBtn.title = 'Sign In';
        }
    }
}

// Function to scroll horizontal containers
function scrollContainer(containerId, scrollAmount) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
}

// Optional: Add drag to scroll functionality
document.querySelectorAll('.scroll-container').forEach(container => {
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.style.cursor = '';
    });

    container.addEventListener('mouseup', () => {
        isDown = false;
        container.style.cursor = '';
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        container.scrollLeft = scrollLeft - walk;
    });
});

// Search bar toggle
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.querySelector('.search-btn');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.querySelector('.search-input');

    if (searchBtn && searchContainer && searchInput) {
        searchBtn.addEventListener('click', () => {
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target) && !searchBtn.contains(e.target)) {
                searchContainer.classList.remove('active');
            }
        });
    }

    // Update auth UI on page load
    updateAuthUI();

    // Authentication button handler
    const authBtn = document.getElementById('auth-btn');
    const signinModal = document.getElementById('signin-modal');
    const signinCloseBtn = document.getElementById('signin-close-btn');
    const signinForm = document.getElementById('signin-form');
    const signinEmail = document.getElementById('signin-email');
    const signinPassword = document.getElementById('signin-password');
    
    // Sign up modal elements
    const signupModal = document.getElementById('signup-modal');
    const signupCloseBtn = document.getElementById('signup-close-btn');
    const signupForm = document.getElementById('signup-form');
    const signupLink = document.getElementById('signup-link');
    const signinLink2 = document.getElementById('signin-link-2');
    
    // Forgot password modal elements
    const forgotModal = document.getElementById('forgot-modal');
    const forgotCloseBtn = document.getElementById('forgot-close-btn');
    const forgotForm = document.getElementById('forgot-form');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToSigninLink = document.getElementById('back-to-signin');
    
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
            
            if (isLoggedIn) {
                // User is logged in, show profile/settings
                const settingsBtn = document.querySelector('a[data-tooltip="Settings"]');
                if (settingsBtn && settingsView) {
                    removeActiveStates();
                    settingsBtn.classList.add('active');
                    settingsView.classList.add('active');
                    saveViewState('settings-view');
                }
            } else {
                // User is not logged in, show sign in modal
                signinModal.classList.remove('hidden');
                signinEmail.focus();
            }
        });
    }

    // Close sign in modal
    function closeSigninModal() {
        signinModal.classList.add('hidden');
        signinForm.reset();
    }

    if (signinCloseBtn) {
        signinCloseBtn.addEventListener('click', closeSigninModal);
    }

    // Close modal when clicking overlay
    const signinOverlay = signinModal ? signinModal.querySelector('.modal-overlay') : null;
    if (signinOverlay) {
        signinOverlay.addEventListener('click', closeSigninModal);
    }

    // Handle sign in form submission
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = signinEmail.value.trim();
            const password = signinPassword.value;
            
            if (email && password) {
                try {
                    // Sign in with Supabase
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) {
                        alert('Error signing in: ' + error.message);
                        return;
                    }
                    
                    // Successfully signed in
                    updateAuthUI();
                    closeSigninModal();
                    alert('Successfully signed in!');
                } catch (error) {
                    alert('Error signing in: ' + error.message);
                }
            }
        });
    }

    // Sign up modal functionality
    function closeSignupModal() {
        signupModal.classList.add('hidden');
        signupForm.reset();
    }

    if (signupCloseBtn) {
        signupCloseBtn.addEventListener('click', closeSignupModal);
    }

    const signupOverlay = signupModal ? signupModal.querySelector('.modal-overlay') : null;
    if (signupOverlay) {
        signupOverlay.addEventListener('click', closeSignupModal);
    }

    // Handle sign up form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const agreeTerms = document.getElementById('agree-terms').checked;
            
            // Extract name from email (everything before @)
            const name = email.split('@')[0];
            
            // Validation
            if (!email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            if (!agreeTerms) {
                alert('Please agree to the Terms of Service and Privacy Policy');
                return;
            }
            
            try {
                // Sign up with Supabase (email confirmation enabled)
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            name: name
                        },
                        emailRedirectTo: window.location.origin
                    }
                });
                
                if (error) {
                    alert('Error signing up: ' + error.message);
                    return;
                }
                
                // Check if user needs to confirm email
                if (data.user && !data.session) {
                    // User created but not confirmed
                    closeSignupModal();
                    alert('Account created successfully! Please check your email to confirm your account.');
                } else if (data.session) {
                    // User automatically signed in (email already confirmed)
                    updateAuthUI();
                    closeSignupModal();
                    alert('Account created successfully! You are now signed in.');
                }
            } catch (error) {
                alert('Error signing up: ' + error.message);
            }
        });
    }

    // Forgot password modal functionality
    function closeForgotModal() {
        forgotModal.classList.add('hidden');
        forgotForm.reset();
    }

    if (forgotCloseBtn) {
        forgotCloseBtn.addEventListener('click', closeForgotModal);
    }

    const forgotOverlay = forgotModal ? forgotModal.querySelector('.modal-overlay') : null;
    if (forgotOverlay) {
        forgotOverlay.addEventListener('click', closeForgotModal);
    }

    // Handle forgot password form submission
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value.trim();
            
            if (!email) {
                alert('Please enter your email address');
                return;
            }
            
            try {
                // Reset password with Supabase
                const { data, error } = await supabase.auth.resetPasswordForEmail(email);
                
                if (error) {
                    alert('Error sending reset email: ' + error.message);
                    return;
                }
                
                alert(`Password reset link has been sent to ${email}`);
                closeForgotModal();
                signinModal.classList.remove('hidden');
                signinEmail.focus();
            } catch (error) {
                alert('Error sending reset email: ' + error.message);
            }
        });
    }

    // Modal navigation links
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSigninModal();
            signupModal.classList.remove('hidden');
            document.getElementById('signup-email').focus();
        });
    }

    if (signinLink2) {
        signinLink2.addEventListener('click', (e) => {
            e.preventDefault();
            closeSignupModal();
            signinModal.classList.remove('hidden');
            signinEmail.focus();
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSigninModal();
            forgotModal.classList.remove('hidden');
            document.getElementById('forgot-email').focus();
        });
    }

    if (backToSigninLink) {
        backToSigninLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeForgotModal();
            signinModal.classList.remove('hidden');
            signinEmail.focus();
        });
    }

    // Navigation View Toggle
    const homeBtn = document.querySelector('a[data-tooltip="Home"]');
    const profileBtn = document.querySelector('.profile-btn');
    const settingsBtn = document.querySelector('a[data-tooltip="Settings"]');

    const homeView = document.getElementById('home-view');
    const profileView = document.getElementById('profile-view');
    const settingsView = document.getElementById('settings-view');
    const watchView = document.getElementById('watch-view');

    // Remove active states
    function removeActiveStates() {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    }

    // Save and restore view state from localStorage
    function saveViewState(viewId) {
        localStorage.setItem('currentView', viewId);
    }

    function restoreViewState() {
        const savedView = localStorage.getItem('currentView') || 'home-view';
        const viewElement = document.getElementById(savedView);
        
        if (viewElement) {
            removeActiveStates();
            viewElement.classList.add('active');
            
            // Activate corresponding nav button
            if (savedView === 'home-view' && homeBtn) {
                homeBtn.classList.add('active');
            } else if (savedView === 'settings-view' && settingsBtn) {
                settingsBtn.classList.add('active');
            }
        }
    }

    // Restore view on page load
    restoreViewState();

    if (homeBtn && homeView) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeActiveStates();
            homeBtn.classList.add('active');
            homeView.classList.add('active');
            saveViewState('home-view');
        });
    }

    if (settingsBtn && settingsView) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeActiveStates();
            settingsBtn.classList.add('active');
            settingsView.classList.add('active');
            saveViewState('settings-view');
        });
    }

    // Video Card Click Logic to show Watch View
    const videoCards = document.querySelectorAll('.video-card');
    if (watchView) {
        videoCards.forEach(card => {
            card.addEventListener('click', () => {
                removeActiveStates();
                watchView.classList.add('active');
                saveViewState('watch-view');
                // You might optionally want to scroll to top
                window.scrollTo(0, 0);
            });
        });

        // Also add click logic for related videos
        const relatedCards = document.querySelectorAll('.related-video-card');
        relatedCards.forEach(card => {
            card.addEventListener('click', () => {
                removeActiveStates();
                watchView.classList.add('active');
                saveViewState('watch-view');
                window.scrollTo(0, 0);
                // In a real app, you would load new video data here
            });
        });
    }

    // Upload Modal Functionality
    const uploadBtn = document.querySelector('a[data-tooltip="Upload"]');
    const uploadModal = document.getElementById('upload-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const uploadCancelBtn = document.getElementById('upload-cancel-btn');
    const videoFileInput = document.getElementById('video-file');
    const videoTitleInput = document.getElementById('video-title');
    const uploadSubmitBtn = document.getElementById('upload-submit-btn');
    const fileNameDisplay = document.getElementById('file-name');
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    const uploadProgress = document.getElementById('upload-progress');

    // Open modal
    if (uploadBtn && uploadModal) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            uploadModal.classList.remove('hidden');
        });
    }

    // Close modal
    function closeUploadModal() {
        if (uploadModal) uploadModal.classList.add('hidden');
        if (videoFileInput) videoFileInput.value = '';
        if (videoTitleInput) videoTitleInput.value = '';
        if (fileNameDisplay) fileNameDisplay.textContent = '';
        if (uploadProgress) uploadProgress.classList.add('hidden');
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeUploadModal);
    }

    if (uploadCancelBtn) {
        uploadCancelBtn.addEventListener('click', closeUploadModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeUploadModal);
    }

    // File input change handler
    if (videoFileInput) {
        videoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileNameDisplay.textContent = `Selected: ${file.name}`;
            }
        });
    }

    // Drag and drop functionality
    if (fileInputWrapper) {
        fileInputWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputWrapper.style.borderColor = 'var(--accent-color)';
            fileInputWrapper.style.backgroundColor = 'rgba(229, 9, 20, 0.05)';
        });

        fileInputWrapper.addEventListener('dragleave', () => {
            fileInputWrapper.style.borderColor = 'var(--border-color)';
            fileInputWrapper.style.backgroundColor = 'transparent';
        });

        fileInputWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputWrapper.style.borderColor = 'var(--border-color)';
            fileInputWrapper.style.backgroundColor = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                videoFileInput.files = files;
                fileNameDisplay.textContent = `Selected: ${files[0].name}`;
            } else {
                alert('Please select a valid video file.');
            }
        });
    }

    // Upload submit handler
    if (uploadSubmitBtn) {
        uploadSubmitBtn.addEventListener('click', () => {
            const file = videoFileInput.files[0];
            const title = videoTitleInput.value.trim();

            if (!file) {
                alert('Please select a video file.');
                return;
            }

            if (!title) {
                alert('Please enter a video title.');
                return;
            }

            // Show progress
            uploadProgress.classList.remove('hidden');
            uploadSubmitBtn.disabled = true;

            // Simulate upload (3 seconds)
            setTimeout(() => {
                // Create new video card
                const videoGrid = document.querySelector('.video-grid');
                const newVideoCard = document.createElement('article');
                newVideoCard.className = 'video-card';
                
                // Create a thumbnail from a placeholder (since we can't actually process video files)
                const randomImageIndex = Math.floor(Math.random() * 5);
                const placeholderImages = [
                    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=1000&h=562',
                    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1000&h=562',
                    'https://images.unsplash.com/photo-1457449940276-e8deed18bfff?auto=format&fit=crop&q=80&w=1000&h=562',
                    'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=1000&h=562',
                    'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?auto=format&fit=crop&q=80&w=1000&h=562'
                ];

                newVideoCard.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${placeholderImages[randomImageIndex]}" alt="${title}" class="thumbnail">
                        <span class="duration">0:00</span>
                    </div>
                    <div class="video-info">
                        <div class="details">
                            <h3 class="video-title">${title.length > 50 ? title.substring(0, 47) + '...' : title}</h3>
                            <div class="video-stats">
                                <span>0</span>
                                <span>now</span>
                                <span><i class="fa-regular fa-heart"></i> 0</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add to grid (prepend to show at the top)
            videoGrid.insertBefore(newVideoCard, videoGrid.firstChild);

            // Add click handler to new video card
            newVideoCard.addEventListener('click', () => {
                removeActiveStates();
                watchView.classList.add('active');
                saveViewState('watch-view');
                window.scrollTo(0, 0);
            });

            // Store uploaded video in localStorage
            let uploadedVideos = JSON.parse(localStorage.getItem('uploadedVideos')) || [];
            uploadedVideos.push({
                title: title,
                fileName: file.name,
                uploadDate: new Date().toISOString()
            });
            localStorage.setItem('uploadedVideos', JSON.stringify(uploadedVideos));

            // Reset and close modal
            uploadProgress.classList.add('hidden');
            uploadSubmitBtn.disabled = false;
            alert('Video uploaded successfully!');
            closeUploadModal();
        }, 3000);
    });
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            try {
                // Sign out with Supabase
                const { error } = await supabase.auth.signOut();
                
                if (error) {
                    console.error('Error signing out:', error.message);
                }
                
                // Clear localStorage
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('currentView');
                
                updateAuthUI(); // Update UI to show Sign In button
                
                // Go to home view after logout
                removeActiveStates();
                if (homeBtn && homeView) {
                    homeBtn.classList.add('active');
                    homeView.classList.add('active');
                }
            } catch (error) {
                console.error('Error signing out:', error.message);
                // Still clear local data even if Supabase sign out fails
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('currentView');
                updateAuthUI();
                removeActiveStates();
                if (homeBtn && homeView) {
                    homeBtn.classList.add('active');
                    homeView.classList.add('active');
                }
            }
        }
    });
}

// Set up Supabase auth state listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
        // User signed in
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', session.user.email || '');
        localStorage.setItem('userName', session.user.user_metadata?.name || session.user.email?.split('@')[0] || '');
    } else if (event === 'SIGNED_OUT') {
        // User signed out
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
    }
    
    // Update UI
    updateAuthUI();
});