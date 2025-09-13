document.addEventListener('DOMContentLoaded', () => {
    const showLoginBtn = document.getElementById('show-login');
    const showRegisterBtn = document.getElementById('show-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    // Function to switch between login and register forms
    function showForm(formToShow) {
        if (formToShow === 'login') {
            loginForm.classList.remove('translate-x-full'); // Ensure login form is visible
            loginForm.classList.add('translate-x-0');

            registerForm.classList.remove('translate-x-0'); // Move register form off-screen
            registerForm.classList.add('translate-x-full');

            // Update button styles for active login tab
            showLoginBtn.classList.add('bg-primary', 'text-white', 'shadow-md', 'transform', 'scale-105');
            showLoginBtn.classList.remove('bg-transparent', 'text-text-secondary', 'hover:text-primary');
            
            showRegisterBtn.classList.remove('bg-primary', 'text-white', 'shadow-md', 'transform', 'scale-105');
            showRegisterBtn.classList.add('bg-transparent', 'text-text-secondary', 'hover:text-primary');

        } else { // formToShow === 'register'
            registerForm.classList.remove('translate-x-full'); // Ensure register form is visible
            registerForm.classList.add('translate-x-0');

            loginForm.classList.remove('translate-x-0'); // Move login form off-screen
            loginForm.classList.add('translate-x-full');

            // Update button styles for active register tab
            showRegisterBtn.classList.add('bg-primary', 'text-white', 'shadow-md', 'transform', 'scale-105');
            showRegisterBtn.classList.remove('bg-transparent', 'text-text-secondary', 'hover:text-primary');
            
            showLoginBtn.classList.remove('bg-primary', 'text-white', 'shadow-md', 'transform', 'scale-105');
            showLoginBtn.classList.add('bg-transparent', 'text-text-secondary', 'hover:text-primary');
        }
        loginError.classList.add('hidden');
        registerError.classList.add('hidden');
    }

    // Event listeners for tab buttons
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => showForm('login'));
    }
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => showForm('register'));
    }

    // Initially show the login form
    showForm('login');

    // --- Authentication Functions ---
    const API_BASE_URL = 'http://127.0.0.1:8000'; // Replace with your backend URL

    async function loginUser(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('authToken', data.access_token);
            console.log('Redirecting to:', '/pages/community_feed_dashboard.html');
            window.location.replace('/pages/community_feed_dashboard.html'); // Redirect to dashboard
        } catch (error) {
            console.error('Login error:', error.message);
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    }

    async function registerUser(username, email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            // After successful registration, automatically log in the user
            await loginUser(username, password); // This will handle redirection
        } catch (error) {
            console.error('Registration error:', error.message);
            registerError.textContent = error.message;
            registerError.classList.remove('hidden');
        }
    }

    // --- Form Submission Handlers ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            await loginUser(username, password);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            if (password !== confirmPassword) {
                registerError.textContent = 'Passwords do not match';
                registerError.classList.remove('hidden');
                return;
            }
            await registerUser(username, email, password);
        });
    }

    // --- Utility Functions ---
    window.isAuthenticated = () => {
        return localStorage.getItem('authToken') !== null;
    };

    window.getAuthToken = () => {
        return localStorage.getItem('authToken');
    };

    window.logout = () => {
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
    };
});
