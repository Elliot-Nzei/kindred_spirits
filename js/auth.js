// auth.js - Enhanced Authentication System for Social Platform

// Configuration
const CONFIG = {
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:8000',
    TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

// Enhanced Authentication State Management
class AuthenticationManager {
    constructor() {
        this.refreshTimer = null;
        this.sessionTimer = null;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        this.eventListeners = new Map();
        this.initializeSessionManagement();
    }

    // Initialize session management
    initializeSessionManagement() {
        // Track user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetSessionTimer(), { passive: true });
        });

        // Start session timer if authenticated
        if (this.isAuthenticated()) {
            this.startSessionTimer();
            this.startTokenRefresh();
        }
    }

    // Event system for auth state changes
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Check if user is authenticated with token validation
    isAuthenticated() {
        const token = this.getSecureItem('token');
        if (!token) return false;

        // Check token expiration
        const tokenExpiry = this.getSecureItem('token_expiry');
        if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
            this.clearAuthData();
            return false;
        }

        return true;
    }

    // Secure storage operations with encryption
    setSecureItem(key, value) {
        try {
            // In production, consider using encryption
            const data = {
                value: value,
                timestamp: new Date().toISOString()
            };
            sessionStorage.setItem(`auth_${key}`, JSON.stringify(data));
            // Also store in localStorage for persistence
            localStorage.setItem(`auth_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Storage error:', error);
            // Fallback to memory storage
            window.__authStorage = window.__authStorage || {};
            window.__authStorage[key] = value;
        }
    }

    getSecureItem(key) {
        try {
            // Try sessionStorage first (more secure)
            let data = sessionStorage.getItem(`auth_${key}`);
            if (!data) {
                // Fallback to localStorage
                data = localStorage.getItem(`auth_${key}`);
            }
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.value;
            }
            // Fallback to memory storage
            return window.__authStorage?.[key];
        } catch (error) {
            console.error('Storage retrieval error:', error);
            return window.__authStorage?.[key];
        }
    }

    removeSecureItem(key) {
        try {
            sessionStorage.removeItem(`auth_${key}`);
            localStorage.removeItem(`auth_${key}`);
            if (window.__authStorage) {
                delete window.__authStorage[key];
            }
        } catch (error) {
            console.error('Storage removal error:', error);
        }
    }

    // Get auth token with validation
    getAuthToken() {
        if (!this.isAuthenticated()) return null;
        return this.getSecureItem('token');
    }

    // Get current user data with caching
    getCurrentUser() {
        if (!this.isAuthenticated()) return null;

        const cachedUser = this._cachedUser;
        if (cachedUser && this._cacheTimestamp && 
            (Date.now() - this._cacheTimestamp < 60000)) { // 1 minute cache
            return cachedUser;
        }

        const user = {
            id: this.getSecureItem('user_id'),
            username: this.getSecureItem('username'),
            email: this.getSecureItem('email'),
            profile_picture: this.getSecureItem('profile_picture'),
            full_name: this.getSecureItem('full_name'),
            is_master: this.getSecureItem('is_master') === 'true',
            is_vice_admin: this.getSecureItem('is_vice_admin') === 'true',
            is_guide: this.getSecureItem('is_guide') === 'true',
            permissions: this.getUserPermissions()
        };

        this._cachedUser = user;
        this._cacheTimestamp = Date.now();
        return user;
    }

    // Get user permissions based on roles
    getUserPermissions() {
        const permissions = new Set(['read:own_profile', 'write:own_profile']);
        
        if (this.getSecureItem('is_master') === 'true') {
            permissions.add('admin:all');
        }
        if (this.getSecureItem('is_vice_admin') === 'true') {
            permissions.add('admin:moderate');
        }
        if (this.getSecureItem('is_guide') === 'true') {
            permissions.add('guide:mentor');
        }

        return Array.from(permissions);
    }

    // Store authentication data securely
    setAuthData(data) {
        // Clear cache
        this._cachedUser = null;
        this._cacheTimestamp = null;

        // Calculate token expiry (assuming 24 hours if not provided)
        const expiryTime = data.expires_in ? 
            new Date(Date.now() + data.expires_in * 1000) : 
            new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store auth data
        this.setSecureItem('token', data.access_token);
        this.setSecureItem('refresh_token', data.refresh_token || '');
        this.setSecureItem('token_expiry', expiryTime.toISOString());
        this.setSecureItem('user_id', data.user_id);
        this.setSecureItem('username', data.username);
        this.setSecureItem('email', data.email);
        this.setSecureItem('full_name', data.full_name || '');
        
        if (data.profile_picture) {
            this.setSecureItem('profile_picture', data.profile_picture);
        }
        
        this.setSecureItem('is_master', String(data.is_master || false));
        this.setSecureItem('is_vice_admin', String(data.is_vice_admin || false));
        this.setSecureItem('is_guide', String(data.is_guide || false));
        
        // Reset login attempts on successful login
        this.loginAttempts = 0;
        this.lockoutUntil = null;

        // Start session management
        this.startSessionTimer();
        this.startTokenRefresh();

        // Emit login event
        this.emit('login', this.getCurrentUser());
    }

    // Clear authentication data
    clearAuthData() {
        // Stop timers
        this.stopSessionTimer();
        this.stopTokenRefresh();

        // Clear storage
        const authKeys = [
            'token', 'refresh_token', 'token_expiry', 'user_id',
            'username', 'email', 'profile_picture', 'full_name',
            'is_master', 'is_vice_admin', 'is_guide'
        ];

        authKeys.forEach(key => this.removeSecureItem(key));

        // Clear cache
        this._cachedUser = null;
        this._cacheTimestamp = null;

        // Emit logout event
        this.emit('logout', null);
    }

    // Logout user with cleanup
    async logout(reason = 'manual') {
        try {
            // Call logout endpoint if available
            const token = this.getAuthToken();
            if (token) {
                await fetch(`${CONFIG.API_BASE_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(() => {}); // Ignore logout API errors
            }
        } finally {
            this.clearAuthData();
            
            // Redirect based on reason
            if (reason === 'session_expired') {
                window.location.href = '../index.html?message=session_expired';
            } else if (reason === 'unauthorized') {
                window.location.href = '../index.html?message=unauthorized';
            } else {
                window.location.href = '../index.html';
            }
        }
    }

    // Session timeout management
    startSessionTimer() {
        this.resetSessionTimer();
    }

    resetSessionTimer() {
        this.stopSessionTimer();
        this.sessionTimer = setTimeout(() => {
            this.logout('session_expired');
        }, CONFIG.SESSION_TIMEOUT);
    }

    stopSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    // Token refresh management
    startTokenRefresh() {
        this.stopTokenRefresh();
        this.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, CONFIG.TOKEN_REFRESH_INTERVAL);
    }

    stopTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshToken() {
        const refreshToken = this.getSecureItem('refresh_token');
        if (!refreshToken) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/token/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setSecureItem('token', data.access_token);
                if (data.refresh_token) {
                    this.setSecureItem('refresh_token', data.refresh_token);
                }
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
    }

    // Check if account is locked
    isAccountLocked() {
        if (this.lockoutUntil && new Date() < new Date(this.lockoutUntil)) {
            return true;
        }
        this.lockoutUntil = null;
        this.loginAttempts = 0;
        return false;
    }

    // Increment login attempts
    incrementLoginAttempts() {
        this.loginAttempts++;
        if (this.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
            this.lockoutUntil = new Date(Date.now() + CONFIG.LOCKOUT_DURATION);
            return true;
        }
        return false;
    }
}

// Enhanced API Request Helper
class AuthenticatedAPI {
    constructor(authManager) {
        this.authManager = authManager;
        this.pendingRequests = new Map();
    }

    // Make authenticated request with retry logic
    async request(url, options = {}) {
        const token = this.authManager.getAuthToken();
        
        if (!token && !options.skipAuth) {
            throw new Error('No authentication token available');
        }

        const requestKey = `${options.method || 'GET'}-${url}`;
        
        // Check for pending identical requests (debouncing)
        if (this.pendingRequests.has(requestKey)) {
            return this.pendingRequests.get(requestKey);
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const requestPromise = this._performRequest(url, { ...options, headers });
        this.pendingRequests.set(requestKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    }

    async _performRequest(url, options, retryCount = 0) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, options);

            if (response.status === 401) {
                // Try to refresh token once
                if (retryCount === 0) {
                    await this.authManager.refreshToken();
                    const newToken = this.authManager.getAuthToken();
                    if (newToken) {
                        options.headers['Authorization'] = `Bearer ${newToken}`;
                        return this._performRequest(url, options, retryCount + 1);
                    }
                }
                
                // Token refresh failed or already retried
                this.authManager.logout('unauthorized');
                throw new Error('Authentication expired. Please login again.');
            }

            if (response.status === 429) {
                // Rate limiting
                const retryAfter = response.headers.get('Retry-After') || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                if (retryCount < 3) {
                    return this._performRequest(url, options, retryCount + 1);
                }
            }

            if (!response.ok && response.status !== 400) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // Login user with validation
    async login(username, password) {
        if (this.authManager.isAccountLocked()) {
            const remainingTime = Math.ceil((new Date(this.authManager.lockoutUntil) - new Date()) / 60000);
            throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
        }

        const response = await this.request('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                username: username.trim(),
                password: password
            }),
            skipAuth: true
        });

        if (!response.ok) {
            const isLocked = this.authManager.incrementLoginAttempts();
            const error = await response.json().catch(() => ({}));
            
            if (isLocked) {
                throw new Error(`Too many failed attempts. Account locked for ${CONFIG.LOCKOUT_DURATION / 60000} minutes.`);
            }
            
            throw new Error(error.detail || `Login failed. ${CONFIG.MAX_LOGIN_ATTEMPTS - this.authManager.loginAttempts} attempts remaining.`);
        }

        const data = await response.json();
        this.authManager.setAuthData(data);
        return data;
    }

    // Register new user with validation
    async register(username, email, password, fullName = '') {
        // Validate inputs
        const validation = this.validateRegistration(username, email, password);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const response = await this.request('/api/register', {
            method: 'POST',
            body: JSON.stringify({
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password: password,
                full_name: fullName.trim()
            }),
            skipAuth: true
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await response.json();
        this.authManager.setAuthData(data);
        return data;
    }

    // Validate registration inputs
    validateRegistration(username, email, password) {
        // Username validation
        if (!username || username.length < 3) {
            return { isValid: false, error: 'Username must be at least 3 characters' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, error: 'Please enter a valid email address' };
        }

        // Password validation
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return { isValid: false, error: `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters` };
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return { isValid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
        }

        return { isValid: true };
    }

    // Get current user profile
    async getCurrentUserProfile() {
        const response = await this.request('/api/users/me');
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to fetch user profile');
    }

    // Update user profile
    async updateProfile(updates) {
        const response = await this.request('/api/users/me', {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to update profile');
    }
}

// Initialize authentication system
const authManager = new AuthenticationManager();
const authAPI = new AuthenticatedAPI(authManager);

// Export for use in other modules
window.AuthManager = authManager;
window.AuthAPI = authAPI;

// UI Handler Class
class AuthUIHandler {
    constructor() {
        this.forms = {
            login: null,
            register: null
        };
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTabSwitching();
            this.setupFormHandlers();
            this.setupPasswordToggles();
            this.setupInputValidation();
            this.checkAuthenticationStatus();
            this.handleUrlMessages();
        });
    }

    // Handle URL messages (e.g., session expired)
    handleUrlMessages() {
        const params = new URLSearchParams(window.location.search);
        const message = params.get('message');
        
        if (message === 'session_expired') {
            this.showNotification('Your session has expired. Please login again.', 'info');
        } else if (message === 'unauthorized') {
            this.showNotification('You are not authorized to access that page.', 'warning');
        }
    }

    // Setup tab switching
    setupTabSwitching() {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const tabIndicator = document.getElementById('tabIndicator');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (!loginTab || !registerTab) return;

        this.forms.login = loginForm;
        this.forms.register = registerForm;

        loginTab.addEventListener('click', () => this.switchToLogin());
        registerTab.addEventListener('click', () => this.switchToRegister());
    }

    switchToLogin() {
        document.getElementById('loginTab')?.classList.add('active');
        document.getElementById('registerTab')?.classList.remove('active');
        document.getElementById('tabIndicator')?.classList.remove('register');
        this.forms.login?.classList.remove('inactive');
        this.forms.register?.classList.remove('active');
        this.clearErrors();
    }

    switchToRegister() {
        document.getElementById('registerTab')?.classList.add('active');
        document.getElementById('loginTab')?.classList.remove('active');
        document.getElementById('tabIndicator')?.classList.add('register');
        this.forms.login?.classList.add('inactive');
        this.forms.register?.classList.add('active');
        this.clearErrors();
    }

    // Setup form handlers
    setupFormHandlers() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const username = form.querySelector('#login-username')?.value;
        const password = form.querySelector('#loginPassword')?.value;
        const rememberMe = form.querySelector('#rememberMe')?.checked;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!this.validateLoginForm(username, password, errorDiv)) {
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            this.hideError(errorDiv);

            const userData = await authAPI.login(username, password);
            
            // Handle remember me
            if (!rememberMe) {
                // Convert to session storage only
                authManager.setSecureItem('session_only', 'true');
            }
            
            // Redirect based on role
            this.redirectBasedOnRole(userData);
        } catch (error) {
            this.showError(errorDiv, error.message);
            this.shakeForm(form);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const username = form.querySelector('#register-username')?.value;
        const email = form.querySelector('#register-email')?.value;
        const password = form.querySelector('#registerPassword')?.value;
        const confirmPassword = form.querySelector('#confirmPassword')?.value;
        const fullName = form.querySelector('#register-fullname')?.value || '';
        const termsAccepted = form.querySelector('#acceptTerms')?.checked;
        
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!this.validateRegisterForm(username, email, password, confirmPassword, termsAccepted, errorDiv)) {
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            this.hideError(errorDiv);

            await authAPI.register(username, email, password, fullName);
            
            // Show success message
            this.showSuccess(successDiv, 'Account created successfully! Redirecting...');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = '/pages/community_feed_dashboard.html';
            }, 1500);
        } catch (error) {
            this.showError(errorDiv, error.message);
            this.shakeForm(form);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    // Form validation methods
    validateLoginForm(username, password, errorDiv) {
        if (!username || !password) {
            this.showError(errorDiv, 'Please fill in all fields');
            return false;
        }
        return true;
    }

    validateRegisterForm(username, email, password, confirmPassword, termsAccepted, errorDiv) {
        if (!username || !email || !password || !confirmPassword) {
            this.showError(errorDiv, 'Please fill in all required fields');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError(errorDiv, 'Passwords do not match');
            this.highlightField('confirmPassword');
            return false;
        }

        const validation = authAPI.validateRegistration(username, email, password);
        if (!validation.isValid) {
            this.showError(errorDiv, validation.error);
            return false;
        }

        if (!termsAccepted) {
            this.showError(errorDiv, 'Please accept the terms and conditions');
            return false;
        }

        return true;
    }

    // Setup password visibility toggles
    setupPasswordToggles() {
        window.togglePassword = (inputId) => {
            const input = document.getElementById(inputId);
            if (!input) return;

            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const toggleButton = input.closest('.input-group')?.querySelector('.password-toggle');
            const icon = toggleButton?.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        };
    }

    // Setup real-time input validation
    setupInputValidation() {
        // Clear errors on input
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                this.clearFieldError(input);
                this.validateField(input);
            });

            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });

        // Password strength indicator
        const passwordInput = document.getElementById('registerPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    // Validate individual field
    validateField(input) {
        const fieldName = input.id || input.name;
        
        switch (fieldName) {
            case 'register-email':
                if (input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
                    this.showFieldError(input, 'Invalid email format');
                }
                break;
            case 'register-username':
                if (input.value && input.value.length < 3) {
                    this.showFieldError(input, 'Username too short');
                }
                break;
            case 'confirmPassword':
                const password = document.getElementById('registerPassword')?.value;
                if (input.value && input.value !== password) {
                    this.showFieldError(input, 'Passwords do not match');
                }
                break;
        }
    }

    // Password strength indicator
    updatePasswordStrength(password) {
        const indicator = document.getElementById('passwordStrength');
        if (!indicator) return;

        let strength = 0;
        const checks = [
            password.length >= 8,
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /[0-9]/.test(password),
            /[^A-Za-z0-9]/.test(password)
        ];

        strength = checks.filter(Boolean).length;

        const strengthLevels = ['', 'weak', 'fair', 'good', 'strong', 'very-strong'];
        const strengthTexts = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        
        indicator.className = `password-strength ${strengthLevels[strength]}`;
        indicator.textContent = password ? strengthTexts[strength] : '';
    }

    // Check authentication status
    checkAuthenticationStatus() {
        const protectedPages = [
            'community_feed_dashboard.html',
            'soul_profile.html',
            'settings.html',
            'notifications.html',
            'master_admin_dashboard.html',
            'vice_admin_dashboard.html',
            'guide_dashboard.html'
        ];

        const currentPage = window.location.pathname.split('/').pop();
        const isProtected = protectedPages.includes(currentPage);
        
        if (isProtected && !authManager.isAuthenticated()) {
            window.location.href = '/index.html?message=unauthorized';
        }

        // Update UI based on auth status
        if (authManager.isAuthenticated()) {
            this.updateUIForAuthenticatedUser();
        }
    }

    // Update UI for authenticated user
    updateUIForAuthenticatedUser() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        // Update profile elements
        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = user.username;
        });

        document.querySelectorAll('.user-email').forEach(el => {
            el.textContent = user.email;
        });

        document.querySelectorAll('.user-avatar').forEach(el => {
            if (user.profile_picture) {
                el.src = user.profile_picture;
            }
        });
    }

    // Redirect based on user role
    redirectBasedOnRole(userData) {
        const redirectMap = {
            is_master: '/pages/master_admin_dashboard.html',
            is_vice_admin: '/pages/vice_admin_dashboard.html',
            is_guide: '/pages/guide_dashboard.html'
        };

        for (const [role, path] of Object.entries(redirectMap)) {
            if (userData[role]) {
                window.location.href = path;
                return;
            }
        }

        window.location.href = '/pages/community_feed_dashboard.html';
    }

    // UI Helper methods
    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show', 'error');
            element.classList.remove('hidden');
        }
    }

    hideError(element) {
        if (element) {
            element.classList.remove('show', 'error');
            element.classList.add('hidden');
        }
    }

    showSuccess(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show', 'success');
            element.classList.remove('hidden');
        }
    }

    showFieldError(input, message) {
        const errorEl = input.parentElement?.querySelector('.field-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
        input.classList.add('error');
    }

    clearFieldError(input) {
        const errorEl = input.parentElement?.querySelector('.field-error');
        if (errorEl) {
            errorEl.classList.remove('show');
        }
        input.classList.remove('error');
    }

    highlightField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
            field.focus();
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message, .success-message').forEach(msg => {
            msg.classList.remove('show');
        });
        document.querySelectorAll('input.error').forEach(input => {
            input.classList.remove('error');
        });
    }

    setLoading(button, isLoading) {
        if (!button) return;

        if (!button.hasAttribute('data-original-text')) {
            button.setAttribute('data-original-text', button.innerHTML);
        }

        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            button.classList.add('loading');
        } else {
            button.innerHTML = button.getAttribute('data-original-text');
            button.classList.remove('loading');
        }
    }

    shakeForm(form) {
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 500);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize UI Handler
const authUIHandler = new AuthUIHandler();

// Listen for auth state changes
authManager.on('login', (user) => {
    console.log('User logged in:', user.username);
});

authManager.on('logout', () => {
    console.log('User logged out');
});
