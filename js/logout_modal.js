class LogoutModalManager {
    constructor() {
        this.modal = null;
        this.confirmBtn = null;
        this.cancelBtn = null;
        this.logoutTriggers = null;
        this.isProcessing = false;
        this.callbacks = {
            onConfirm: null,
            onCancel: null
        };
        this.init();
    }

    init() {
        // Use DOMContentLoaded or immediate execution if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Find modal element
        this.modal = document.getElementById('logoutModal');
        
        if (!this.modal) {
            console.warn('Logout modal element not found. Creating dynamically...');
            this.createModal();
        }

        // Find or create modal buttons
        this.confirmBtn = document.getElementById('logout-confirm-btn');
        this.cancelBtn = document.getElementById('logout-cancel-btn');

        // Find all logout triggers
        this.logoutTriggers = document.querySelectorAll('[data-logout], .logout-btn');

        if (this.logoutTriggers.length === 0) {
            console.info('No logout triggers found on this page');
            return;
        }

        this.attachEventListeners();
        this.setupKeyboardHandlers();
        this.setupClickOutsideHandler();
        
        console.log('Logout modal manager initialized successfully');
    }

    createModal() {
        // Create modal dynamically if it doesn't exist
        const modalHTML = `
            <div id="logoutModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
                <div class="modal-container">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="logout-modal-title" class="modal-title">
                                <i class="fas fa-sign-out-alt"></i> Confirm Logout
                            </h2>
                        </div>
                        <div class="modal-body">
                            <p class="modal-message">
                                Are you sure you want to log out? You will need to sign in again to access your account.
                            </p>
                            <div class="modal-info">
                                <i class="fas fa-info-circle"></i>
                                <span>Any unsaved changes will be lost.</span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="logout-cancel-btn" class="btn btn-secondary" type="button">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button id="logout-confirm-btn" class="btn btn-danger" type="button">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('logoutModal');

        // Add styles if not present
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('logout-modal-styles')) return;

        const styles = `
            <style id="logout-modal-styles">
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur(4px);
                }

                .modal-overlay:not(.hidden) {
                    opacity: 1;
                }

                .modal-overlay.hidden {
                    pointer-events: none;
                }

                .modal-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    max-width: 450px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: auto;
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }

                .modal-overlay:not(.hidden) .modal-container {
                    transform: scale(1);
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1f2937;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .modal-message {
                    margin: 0 0 1rem 0;
                    color: #4b5563;
                    line-height: 1.6;
                }

                .modal-info {
                    background-color: #fef3c7;
                    border: 1px solid #fcd34d;
                    border-radius: 6px;
                    padding: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #92400e;
                    font-size: 0.9rem;
                }

                .modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }

                .btn {
                    padding: 0.625rem 1.25rem;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 1rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background-color: #f3f4f6;
                    color: #374151;
                }

                .btn-secondary:hover:not(:disabled) {
                    background-color: #e5e7eb;
                }

                .btn-danger {
                    background-color: #ef4444;
                    color: white;
                }

                .btn-danger:hover:not(:disabled) {
                    background-color: #dc2626;
                }

                .btn.loading {
                    position: relative;
                    color: transparent;
                }

                .btn.loading::after {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    top: 50%;
                    left: 50%;
                    margin-left: -8px;
                    margin-top: -8px;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spinner 0.6s linear infinite;
                }

                @keyframes spinner {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .modal-container {
                        width: 95%;
                    }

                    .modal-footer {
                        flex-direction: column-reverse;
                    }

                    .btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    attachEventListeners() {
        // Attach logout triggers with capture phase to intercept other handlers
        this.logoutTriggers.forEach(trigger => {
            // Remove any existing listeners first
            trigger.removeEventListener('click', this.handleLogoutClick);
            
            // Add new listener in capture phase with higher priority
            trigger.addEventListener('click', (e) => this.handleLogoutClick(e), true);
        });

        // Attach modal button handlers
        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.handleCancel());
        }

        // Listen for custom events
        window.addEventListener('logout:request', () => this.show());
        window.addEventListener('logout:force', () => this.forceLogout());
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (!this.modal || this.modal.classList.contains('hidden')) return;

            if (e.key === 'Escape') {
                this.handleCancel();
            } else if (e.key === 'Enter' && e.ctrlKey) {
                // Ctrl+Enter for quick confirm (advanced users)
                this.handleConfirm();
            }
        });
    }

    setupClickOutsideHandler() {
        if (!this.modal) return;

        this.modal.addEventListener('click', (e) => {
            // Check if click was on the overlay (outside the modal content)
            if (e.target === this.modal) {
                this.handleCancel();
            }
        });
    }

    handleLogoutClick(e) {
        // Prevent all other handlers from firing
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Check if there are unsaved changes
        if (this.hasUnsavedChanges()) {
            this.showUnsavedChangesWarning();
        }
        this.show();
    }

    hasUnsavedChanges() {
        // Check for forms with unsaved data
        const forms = document.querySelectorAll('form[data-unsaved="true"]');
        if (forms.length > 0) return true;

        // Check for custom unsaved data flag
        if (window.hasUnsavedChanges) return true;

        // Check for dirty form fields
        const inputs = document.querySelectorAll('input, textarea, select');
        for (let input of inputs) {
            if (input.dataset.originalValue && input.value !== input.dataset.originalValue) {
                return true;
            }
        }

        return false;
    }

    showUnsavedChangesWarning() {
        // Update modal content for unsaved changes
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody) {
            const warningHTML = `
                <p class="modal-message">
                    <strong>Warning:</strong> You have unsaved changes that will be lost if you log out.
                </p>
                <div class="modal-info" style="background-color: #fee2e2; border-color: #fca5a5; color: #991b1b;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>This action cannot be undone.</span>
                </div>
            `;
            modalBody.innerHTML = warningHTML;
        }
        this.show();
    }

    show() {
        if (!this.modal) {
            console.error('Logout modal not found');
            return;
        }

        // Reset processing state
        this.isProcessing = false;
        this.enableButtons();

        // Show modal with animation
        this.modal.classList.remove('hidden');
        
        // Focus on cancel button for safety
        setTimeout(() => {
            this.cancelBtn?.focus();
        }, 100);

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('logout:modal:shown'));

        // Add body scroll lock
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.modal) return;

        this.modal.classList.add('hidden');
        
        // Restore original content if it was changed
        this.restoreOriginalContent();

        // Remove body scroll lock
        document.body.style.overflow = '';

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('logout:modal:hidden'));
    }

    restoreOriginalContent() {
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody && modalBody.dataset.originalContent) {
            modalBody.innerHTML = modalBody.dataset.originalContent;
        } else if (modalBody) {
            // If no original content stored, re-create default content
            modalBody.innerHTML = `
                <p class="modal-message">
                    Are you sure you want to log out? You will need to sign in again to access your account.
                </p>
                <div class="modal-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Any unsaved changes will be lost.</span>
                </div>
            `;
        }
    }

    async handleConfirm() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.setButtonLoading(this.confirmBtn, true);
        this.disableButtons();

        try {
            // Execute custom callback if provided
            if (this.callbacks.onConfirm) {
                await this.callbacks.onConfirm();
            }

            // Perform logout
            await this.performLogout();
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Failed to log out. Please try again.');
            this.isProcessing = false;
            this.setButtonLoading(this.confirmBtn, false);
            this.enableButtons();
        }
    }

    handleCancel() {
        if (this.isProcessing) return;

        // Execute custom callback if provided
        if (this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }

        this.hide();
    }

    async performLogout() {
        // Check if AuthManager is available
        if (window.AuthManager && typeof window.AuthManager.logout === 'function') {
            try {
                // Show logout progress
                this.updateProgress('Logging out...');
                
                // Perform logout
                await window.AuthManager.logout();
                
                // Success feedback
                this.updateProgress('Logged out successfully!');
                
                // Small delay for user feedback
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Logout failed:', error);
                throw error;
            }
        } else {
            console.error('AuthManager not found or logout method not available');
            // Fallback: Clear storage and redirect
            this.fallbackLogout();
        }
    }

    fallbackLogout() {
        // Clear all auth-related storage
        const authKeys = [
            'auth_token', 'auth_user_id', 'auth_username', 'auth_email',
            'auth_profile_picture', 'auth_full_name', 'auth_is_master',
            'auth_is_vice_admin', 'auth_is_guide', 'auth_token_expiry',
            'auth_refresh_token', 'auth_session_only'
        ];

        authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Clear cookies
        document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });

        // Redirect to login page
        window.location.href = '../index.html';
    }

    forceLogout() {
        // Immediate logout without confirmation
        this.performLogout().catch(error => {
            console.error('Force logout failed:', error);
            this.fallbackLogout();
        });
    }

    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            button.classList.add('loading');
        } else {
            button.innerHTML = button.dataset.originalText || 'Logout';
            button.classList.remove('loading');
        }
    }

    disableButtons() {
        if (this.confirmBtn) this.confirmBtn.disabled = true;
        if (this.cancelBtn) this.cancelBtn.disabled = true;
    }

    enableButtons() {
        if (this.confirmBtn) this.confirmBtn.disabled = false;
        if (this.cancelBtn) this.cancelBtn.disabled = false;
    }

    updateProgress(message) {
        const modalBody = this.modal?.querySelector('.modal-body');
        if (modalBody) {
            // Store original content if not already stored
            if (!modalBody.dataset.originalContent) {
                modalBody.dataset.originalContent = modalBody.innerHTML;
            }
            
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #6b7280; margin-bottom: 1rem;"></i>
                    <p style="color: #4b5563; font-weight: 500;">${message}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const modalBody = this.modal?.querySelector('.modal-body');
        if (modalBody) {
            const errorHTML = `
                <div class="modal-error" style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 1rem; color: #991b1b; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </div>
            `;
            
            // Insert error at the beginning of modal body
            modalBody.insertAdjacentHTML('afterbegin', errorHTML);
            
            // Auto-remove error after 5 seconds
            setTimeout(() => {
                const errorEl = modalBody.querySelector('.modal-error');
                if (errorEl) {
                    errorEl.remove();
                }
            }, 5000);
        }
    }

    // Public API methods
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    destroy() {
        // Remove all event listeners
        this.logoutTriggers?.forEach(trigger => {
            trigger.removeEventListener('click', this.handleLogoutClick, true);
        });

        window.removeEventListener('logout:request', () => this.show());
        window.removeEventListener('logout:force', () => this.forceLogout());

        // Remove modal from DOM
        this.modal?.remove();

        // Clear references
        this.modal = null;
        this.confirmBtn = null;
        this.cancelBtn = null;
        this.logoutTriggers = null;
    }
}

// Initialize the logout modal manager
const logoutModalManager = new LogoutModalManager();

// Export for use in other modules
window.LogoutModalManager = logoutModalManager;

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (logoutModalManager.isProcessing) {
        return 'Logout is in progress. Are you sure you want to leave?';
    }
});