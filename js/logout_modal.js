document.addEventListener('DOMContentLoaded', () => {
    const logoutButtons = document.querySelectorAll('[data-logout], .logout-btn');
    const logoutModal = document.getElementById('logoutModal');
    
    if (!logoutModal || logoutButtons.length === 0) {
        return;
    }

    logoutButtons.forEach(button => {
        // This listener uses the capture phase to run BEFORE the one in auth.js.
        // It then stops propagation to prevent the auth.js listener from running.
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            logoutModal.classList.remove('hidden');
        }, true);
    });

    const logoutConfirmBtn = document.getElementById('logout-confirm-btn');
    const logoutCancelBtn = document.getElementById('logout-cancel-btn');

    if (logoutConfirmBtn) {
        logoutConfirmBtn.addEventListener('click', () => {
            if (window.AuthManager && typeof window.AuthManager.logout === 'function') {
                window.AuthManager.logout();
            }
        });
    }

    if (logoutCancelBtn) {
        logoutCancelBtn.addEventListener('click', () => {
            logoutModal.classList.add('hidden');
        });
    }
});