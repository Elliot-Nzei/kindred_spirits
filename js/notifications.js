window.addEventListener('load', () => {
    if (!window.AuthManager.isAuthenticated()) {
        window.location.href = '../index.html';
        return;
    }

    
    const allNotificationsList = document.getElementById("all-notifications-list");
    const template = document.getElementById("notification-template");

    const loadNotifications = async () => {
        try {
            const token = window.AuthManager.getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const notifications = await response.json();
            displayNotifications(notifications);

        } catch (error) {
            console.error('Error loading notifications:', error);
            allNotificationsList.innerHTML = '<p class="text-center text-red-500">Could not load notifications.</p>';
        }
    };

    const displayNotifications = (notifications) => {
        allNotificationsList.innerHTML = '';
        notifications.forEach(notification => {
            const clone = template.content.cloneNode(true);
            const img = clone.querySelector("img");
            const nameEl = clone.querySelector("span.font-semibold");
            const textEl = clone.querySelector(".notification-text");
            const timeEl = clone.querySelector("p.text-gray-500"); // Re-enabled this line

            const defaultAvatar = 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

            img.src = notification.sender_profile_picture ? `${API_BASE_URL}${notification.sender_profile_picture}` : defaultAvatar;
            img.alt = `${notification.sender_username}'s avatar`;
            nameEl.textContent = notification.sender_username;
            textEl.textContent = notification.message;
            if (timeEl) { // Add a check for timeEl in case it's not found
                timeEl.dataset.timestamp = notification.timestamp;
                timeEl.textContent = timeAgo(notification.timestamp);
            }

            if (notification.read) {
                clone.firstElementChild.classList.add('opacity-60');
            }

            clone.firstElementChild.addEventListener('click', () => {
                markNotificationAsRead(notification.id);
                if (notification.link) {
                    window.location.href = notification.link;
                }
            });

            allNotificationsList.appendChild(clone);
        });
    };

    const markNotificationAsRead = async (notificationId) => {
        try {
            const token = window.AuthManager.getAuthToken();
            await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    function timeAgo(timestamp) {
      const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

      if (seconds < 120) { // Less than 2 minutes
          return 'Just now';
      }

      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + "y ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + "mo ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + "d ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + "h ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + "m ago";
      return Math.floor(seconds) + "s ago";
    }
    window.timeAgo = timeAgo; // Expose globally

    loadNotifications();

    // Mobile notification button functionality
    const openNotificationsMobileBtn = document.getElementById('open-notifications-mobile');
    if (openNotificationsMobileBtn) {
        openNotificationsMobileBtn.addEventListener('click', () => {
            window.location.href = 'notifications.html';
        });
    }

    const updateNotificationBadge = async () => {
        const badge = document.getElementById('mobile-notification-badge');
        if (!badge) return;

        try {
            const token = window.AuthManager.getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch unread notification count');
            }

            const data = await response.json();
            const unreadCount = data.unread_count;

            if (unreadCount > 0) {
                if (unreadCount > 9) {
                    badge.textContent = "9+";
                } else {
                    badge.textContent = unreadCount;
                }
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error updating notification badge:', error);
            badge.classList.add('hidden'); // Hide badge on error
        }
    };

    // Update badge on load
    updateNotificationBadge();

    // Update badge every 30 seconds
    setInterval(updateNotificationBadge, 30000);

    // Mark all as read functionality
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                const response = await window.AuthAPI.request('/api/notifications/mark-all-read', {
                    method: 'PUT'
                });

                if (!response.ok) {
                    throw new Error('Failed to mark all notifications as read');
                }

                // Update UI: change opacity of all notifications
                document.querySelectorAll('#all-notifications-list .flex.items-start').forEach(notificationEl => {
                    notificationEl.classList.add('opacity-60');
                });

                // Reload notifications to reflect changes and update badge
                await loadNotifications();
                await updateNotificationBadge();

                // Optionally disable the button if no unread notifications remain
                markAllReadBtn.disabled = true;

            } catch (error) {
                console.error('Error marking all notifications as read:', error);
                alert('Failed to mark all notifications as read. Please try again.');
            }
        });
    }
});