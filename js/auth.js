// auth.js - Complete Authentication System for Social Platform



// Authentication State Management
const AuthManager = {
    // Check if user is authenticated
    isAuthenticated() {
        return localStorage.getItem('token') !== null;
    },

    // Get stored auth token
    getAuthToken() {
        return localStorage.getItem('token');
    },

    // Get current user data
    getCurrentUser() {
        return {
            id: localStorage.getItem('user_id'),
            username: localStorage.getItem('username'),
            email: localStorage.getItem('email'),
            profile_picture: localStorage.getItem('profile_picture')
        };
    },

    // Store authentication data
    setAuthData(data) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);
        localStorage.setItem('email', data.email);
        if (data.profile_picture) {
            localStorage.setItem('profile_picture', data.profile_picture);
        }
        localStorage.setItem('is_master', data.is_master);
        localStorage.setItem('is_vice_admin', data.is_vice_admin);
    },

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('profile_picture');
    },

    // Logout user
    logout() {
        this.clearAuthData();
        window.location.href = '/index.html';
    }
};

// API Request Helper with Authentication
const AuthAPI = {
    // Make authenticated request
    async request(url, options = {}) {
        const token = AuthManager.getAuthToken();
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expired or invalid
            AuthManager.logout();
            throw new Error('Authentication expired. Please login again.');
        }

        return response;
    },

    // Login user
    async login(username, password) {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                username,
                password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        AuthManager.setAuthData(data);
        return data;
    },

    // Register new user
    async register(username, email, password, fullName = '') {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                full_name: fullName
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await response.json();
        AuthManager.setAuthData(data);
        return data;
    }
};

// UI Components and Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching functionality
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const tabIndicator = document.getElementById('tabIndicator');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginTab && registerTab) {
        loginTab.addEventListener('click', () => {
            switchToLogin();
        });

        registerTab.addEventListener('click', () => {
            switchToRegister();
        });
    }

    function switchToLogin() {
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
        tabIndicator?.classList.remove('register');
        loginForm?.classList.remove('inactive');
        registerForm?.classList.remove('active');
    }

    function switchToRegister() {
        registerTab?.classList.add('active');
        loginTab?.classList.remove('active');
        tabIndicator?.classList.add('register');
        loginForm?.classList.add('inactive');
        registerForm?.classList.add('active');
    }

    // Password visibility toggle
    window.togglePassword = (inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Update eye icon if exists
            const toggleButton = input.closest('.input-group')?.querySelector('.password-toggle');
            const icon = toggleButton?.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        }
    };

    // Form submission handlers
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    async function handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('login-username')?.value;
        const password = document.getElementById('loginPassword')?.value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        if (!username || !password) {
            showError(errorDiv, 'Please fill in all fields');
            return;
        }

        try {
            setLoading(submitBtn, true);
            hideError(errorDiv);

            const userData = await AuthAPI.login(username, password);
            
            // Redirect based on role
            if (userData.is_master) {
                window.location.href = '/pages/master_admin_dashboard.html';
            } else if (userData.is_vice_admin) {
                window.location.href = '/pages/vice_admin_dashboard.html';
            } else {
                window.location.href = '/pages/community_feed_dashboard.html';
            }
        } catch (error) {
            showError(errorDiv, error.message);
        } finally {
            setLoading(submitBtn, false);
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const fullName = document.getElementById('register-fullname')?.value || '';
        
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            showError(errorDiv, 'Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            showError(errorDiv, 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError(errorDiv, 'Password must be at least 6 characters');
            return;
        }

        if (!isValidEmail(email)) {
            showError(errorDiv, 'Please enter a valid email address');
            return;
        }

        try {
            setLoading(submitBtn, true);
            hideError(errorDiv);

            await AuthAPI.register(username, email, password, fullName);
            
            // Show success message
            showSuccess(successDiv, 'Account created successfully! Redirecting...');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = '/pages/community_feed_dashboard.html';
            }, 1500);
        } catch (error) {
            showError(errorDiv, error.message);
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Utility functions
    function showError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            element.classList.remove('hidden');
        }
    }

    function hideError(element) {
        if (element) {
            element.classList.remove('show');
            element.classList.add('hidden');
        }
    }

    function showSuccess(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            element.classList.remove('hidden');
        }
    }

    function setLoading(button, isLoading) {
        if (button) {
            button.disabled = isLoading;
            if (isLoading) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else {
                button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            }
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Clear errors on input
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            const errors = document.querySelectorAll('.error-message, .success-message');
            errors.forEach(msg => {
                msg.classList.remove('show');
            });
        });
    });

    // Check authentication on protected pages
    const protectedPages = [
        'community_feed_dashboard.html',
        'soul_profile.html',
        'settings.html',
        'notifications.html'
    ];

    const currentPage = window.location.pathname.split('/').pop();
    if (protectedPages.includes(currentPage) && !AuthManager.isAuthenticated()) {
        window.location.href = '/index.html';
    }

    // Add logout functionality to logout buttons
    document.querySelectorAll('[data-logout], .logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                AuthManager.logout();
            }
        });
    });

    // Auto-logout on token expiration
    if (AuthManager.isAuthenticated()) {
        // Check token validity periodically
        setInterval(async () => {
            try {
                await AuthAPI.request('/api/users/me');
            } catch (error) {
                console.error('Token validation failed:', error);
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
});

// Export for use in other modules
window.AuthManager = AuthManager;
window.AuthAPI = AuthAPI;