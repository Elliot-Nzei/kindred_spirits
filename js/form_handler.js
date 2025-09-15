        let currentForm = 'login';

        // Form switching functions
        function showLogin() {
            switchForm('login');
        }

        function showRegister() {
            switchForm('register');
        }

        function showForgotPassword() {
            switchForm('forgot');
        }

        function switchForm(formType) {
            const forms = {
                login: document.getElementById('loginForm'),
                register: document.getElementById('registerForm'),
                forgot: document.getElementById('forgotPasswordForm')
            };

            const currentFormEl = forms[currentForm];
            const newFormEl = forms[formType];

            if (currentForm === formType) return;

            // Slide out current form
            const slideOutDirection = (currentForm === 'login' && formType === 'register') || 
                                    (currentForm === 'forgot' && formType === 'login') ? 'left' : 'right';
            
            currentFormEl.classList.add(`slide-out-${slideOutDirection}`);

            setTimeout(() => {
                currentFormEl.classList.add('hidden');
                currentFormEl.classList.remove(`slide-out-${slideOutDirection}`, 'form');
                
                // Slide in new form
                const slideInDirection = slideOutDirection === 'left' ? 'right' : 'left';
                newFormEl.classList.remove('hidden');
                newFormEl.classList.add('form', `slide-in-${slideInDirection}`);
                
                setTimeout(() => {
                    newFormEl.classList.remove(`slide-in-${slideInDirection}`);
                }, 500);
            }, 250);

            currentForm = formType;
            clearMessages();
        }

        function clearMessages() {
            const messages = document.querySelectorAll('[id$="Message"]');
            messages.forEach(msg => {
                msg.classList.add('hidden');
                msg.innerHTML = '';
            });
        }

        function showMessage(formType, message, isError = false) {
            const messageEl = document.getElementById(`${formType}Message`);
            messageEl.className = isError ? 'error-message' : 'success-message';
            messageEl.innerHTML = message;
            messageEl.classList.remove('hidden');
        }

        // Password strength checker
        function checkPasswordStrength(password) {
            const strengthFill = document.getElementById('strengthFill');
            const strengthText = document.getElementById('strengthText');
            
            let strength = 0;
            let strengthClass = '';
            let strengthLabel = '';

            if (password.length >= 8) strength++;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
            if (password.match(/\d/) && password.match(/[^a-zA-Z\d]/)) strength++;

            switch (strength) {
                case 0:
                case 1:
                    strengthClass = 'strength-weak';
                    strengthLabel = 'Weak password';
                    break;
                case 2:
                    strengthClass = 'strength-fair';
                    strengthLabel = 'Fair password';
                    break;
                case 3:
                    strengthClass = 'strength-good';
                    strengthLabel = 'Good password';
                    break;
                case 4:
                    strengthClass = 'strength-strong';
                    strengthLabel = 'Strong password';
                    break;
            }

            strengthFill.className = `strength-fill ${strengthClass}`;
            strengthText.textContent = strengthLabel;
        }

        // Event listeners
        document.getElementById('registerPassword').addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });

        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById('loginBtn');
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                showMessage('login', 'Please fill in all fields', true);
                return;
            }
            
            loginBtn.classList.add('btn-loading');
            loginBtn.disabled = true;
            
            try {
                // Call AuthAPI.login from auth.js
                await AuthAPI.login(username, password);
                showMessage('login', 'Welcome back to Kindred Spirits! Redirecting to your dashboard...');
                setTimeout(() => {
                    window.location.href = '/pages/community_feed_dashboard.html';
                }, 1500);
            } catch (error) {
                showMessage('login', error.message || 'Login failed', true);
            } finally {
                loginBtn.classList.remove('btn-loading');
                loginBtn.disabled = false;
            }
        });

        // Register form handler
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const registerBtn = document.getElementById('registerBtn');
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            // Validation
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                showMessage('register', 'Please fill in all fields', true);
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('register', 'Passwords do not match', true);
                return;
            }
            
            if (password.length < 8) {
                showMessage('register', 'Password must be at least 8 characters long', true);
                return;
            }
            
            if (!agreeTerms) {
                showMessage('register', 'Please agree to the Terms of Service and Privacy Policy', true);
                return;
            }
            
            registerBtn.classList.add('btn-loading');
            registerBtn.disabled = true;
            
            try {
                // Construct username and fullName for AuthAPI.register
                const username = (firstName + lastName).toLowerCase(); // Example: johnsmith
                const fullName = `${firstName} ${lastName}`;

                // Call AuthAPI.register from auth.js
                await AuthAPI.register(username, email, password, fullName);
                showMessage('register', `Welcome to Metanoia, ${firstName}! Your soul profile has been created. Redirecting...`);
                setTimeout(() => {
                    window.location.href = '/pages/community_feed_dashboard.html';
                }, 1500);
            } catch (error) {
                showMessage('register', error.message || 'Registration failed', true);
            } finally {
                registerBtn.classList.remove('btn-loading');
                registerBtn.disabled = false;
            }
        });

        // Forgot password form handler (keeping simulation as auth.js doesn't have this function)
        document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const forgotBtn = document.getElementById('forgotBtn');
            const email = document.getElementById('forgotEmail').value;
            
            if (!email) {
                showMessage('forgot', 'Please enter your email address', true);
                return;
            }
            
            forgotBtn.classList.add('btn-loading');
            forgotBtn.disabled = true;
            
            setTimeout(() => {
                forgotBtn.classList.remove('btn-loading');
                forgotBtn.disabled = false;
                
                showMessage('forgot', 'Password reset instructions have been sent to your email address. Please check your inbox and spam folder.');
                
                setTimeout(() => {
                    this.reset();
                    clearMessages();
                }, 3000);
            }, 2000);
        });

        // Add entrance animation
        window.addEventListener('load', function() {
            const formContainer = document.querySelector('.form-container');
            const leftPanel = document.querySelector('.left-panel');
            
            formContainer.style.opacity = '0';
            formContainer.style.transform = 'translateY(30px)';
            leftPanel.style.opacity = '0';
            leftPanel.style.transform = 'translateX(-30px)';
            
            setTimeout(() => {
                formContainer.style.transition = 'all 0.8s ease';
                leftPanel.style.transition = 'all 0.8s ease';
                formContainer.style.opacity = '1';
                formContainer.style.transform = 'translateY(0)';
                leftPanel.style.opacity = '1';
                leftPanel.style.transform = 'translateX(0)';
            }, 100);

            // Event listeners for form switching links
            document.getElementById('forgotPasswordLink')?.addEventListener('click', function(e) {
                e.preventDefault();
                showForgotPassword();
            });

            document.getElementById('showRegisterLink')?.addEventListener('click', function(e) {
                e.preventDefault();
                showRegister();
            });

            document.getElementById('showLoginLinkRegister')?.addEventListener('click', function(e) {
                e.preventDefault();
                showLogin();
            });

            document.getElementById('backToLoginLink')?.addEventListener('click', function(e) {
                e.preventDefault();
                showLogin();
            });
        });