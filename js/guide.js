document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('[data-logout]');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await AuthManager.logout();
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
});
