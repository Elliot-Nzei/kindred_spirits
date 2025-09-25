// Enhanced Master Admin Dashboard User Management
// Improved version with better error handling, state management, and user experience

class UserManager {
    constructor() {
        this.allUsers = [];
        this.filteredUsers = [];
        this.currentSearchTerm = '';
        this.isUpdating = false;
        this.isLoading = false;
        this.cache = new Map();
        this.debounceTimer = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.realtimeUpdateInterval = null;
        
        // Bind methods to preserve context
        this.handleSearch = this.handleSearch.bind(this);
        this.handleRoleChange = this.handleRoleChange.bind(this);
        this.handleSuspensionToggle = this.handleSuspensionToggle.bind(this);
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.showLoading(true);
            await this.validateAuth();
            await this.fetchUsers();
            this.setupEventListeners();
            this.updateUI();
            this.startRealtimeUpdates();
        } catch (error) {
            this.handleError('Failed to initialize dashboard', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Start real-time data updates
     */
    startRealtimeUpdates() {
        if (this.realtimeUpdateInterval) {
            clearInterval(this.realtimeUpdateInterval);
        }
        this.realtimeUpdateInterval = setInterval(async () => {
            const activeElement = document.activeElement;
            const isInteracting = activeElement && (activeElement.closest('#masterAdminList') || activeElement.closest('#allMembersList'));

            if (!this.isLoading && !isInteracting) {
                try {
                    await this.fetchUsers();
                } catch (error) {
                    console.error("Error during real-time update:", error);
                }
            }
        }, 10000); // Refresh every 10 seconds
    }

    /**
     * Validate authentication and permissions
     */
    async validateAuth() {
        if (!window.AuthManager) {
            throw new Error('AuthManager not available');
        }

        const currentUser = AuthManager.getCurrentUser();
        if (!currentUser || !currentUser.is_master) {
            throw new Error('Unauthorized: Master admin privileges required');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            // Remove existing listeners
            searchInput.removeEventListener('input', this.handleSearch);
            searchInput.addEventListener('input', this.handleSearch);
        }

        // Listen for window focus to refresh data
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
        
        // Handle online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    /**
     * Handle search input with debouncing
     */
    handleSearch(event) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.filterUsers(event.target.value);
        }, 300);
    }

    /**
     * Handle role change events
     */
    handleRoleChange(userId, newRole) {
        if (this.isUpdating) {
            this.showNotification('Please wait for the current operation to complete', 'warning');
            return;
        }
        this.updateUserRole(userId, newRole);
    }

    /**
     * Handle suspension toggle events
     */
    handleSuspensionToggle(userId, suspend) {
        if (this.isUpdating) {
            this.showNotification('Please wait for the current operation to complete', 'warning');
            return;
        }
        this.toggleUserSuspension(userId, suspend);
    }

    /**
     * Get role color class with validation
     */
    getRoleClass(role) {
        const roleClasses = {
            'master': 'bg-blue-500 text-white',
            'vice_admin': 'bg-purple-500 text-white',
            'guide': 'bg-green-500 text-white',
            'member': 'bg-gray-500 text-white'
        };
        return roleClasses[role] || 'bg-gray-400 text-white';
    }

    /**
     * Determine user role from user object
     */
    getUserRole(user) {
        if (user.is_master) return 'master';
        if (user.is_vice_admin) return 'vice_admin';
        if (user.is_guide) return 'guide';
        return 'member';
    }

    /**
     * Main render function with improved error handling
     */
    renderUsers(users = this.filteredUsers) {
        if (this.isUpdating) return;

        try {
            const masterAdminList = document.getElementById('masterAdminList');
            const allMembersList = document.getElementById('allMembersList');

            if (masterAdminList) masterAdminList.innerHTML = '';
            if (allMembersList) allMembersList.innerHTML = '';

            if (!users || users.length === 0) {
                this.renderEmptyState();
                return;
            }

            const masterUsers = users.filter(user => user.is_master);
            const regularUsers = users.filter(user => !user.is_master);

            // Render master admins
            masterUsers.forEach(user => {
                if (masterAdminList) {
                    const masterRow = this.createMasterAdminRow(user);
                    masterAdminList.appendChild(masterRow);
                }
            });

            // Render regular users
            regularUsers.forEach(user => {
                if (allMembersList) {
                    const userRow = this.createUserRow(user);
                    allMembersList.appendChild(userRow);
                }
            });

            this.updateUserCounts();
            this.updateSearchResults(users.length);
        } catch (error) {
            console.error('Error rendering users:', error);
            this.showNotification('Failed to display users', 'error');
        }
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const allMembersList = document.getElementById('allMembersList');
        if (allMembersList) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    ${this.currentSearchTerm ? 'No users found matching your search.' : 'No users found.'}
                </td>
            `;
            allMembersList.appendChild(emptyRow);
        }
    }

    /**
     * Create HTML row for a regular user with improved structure
     */
    createUserRow(user) {
        const row = document.createElement('tr');
        row.setAttribute('data-user-id', user.id);
        row.className = user.is_suspended ? 'suspended-user' : '';
        
        const userRole = this.getUserRole(user);
        const roleDisplayName = this.getRoleDisplayName(userRole);

        row.innerHTML = `
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div class="user-info">
                    <img src="${this.escapeHtml(user.profile_picture || '../img/default-avatar.jpg')}" 
                         alt="Profile picture for ${this.escapeHtml(user.username)}" 
                         class="user-avatar"
                         onerror="this.src='../img/default-avatar.jpg'">
                    <div>
                        <div class="user-name">${this.escapeHtml(user.username)}</div>
                        <div class="user-email">${this.escapeHtml(user.email)}</div>
                    </div>
                </div>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <span class="role-badge ${this.getRoleClass(userRole)}">
                    ${roleDisplayName}
                </span>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${user.is_suspended ? 'suspended' : 'active'}">
                    ${user.is_suspended ? 'Suspended' : 'Active'}
                </span>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div class="action-buttons">
                    <select class="role-selector" 
                            onchange="userManager.handleRoleChange('${user.id}', this.value)"
                            ${this.isUpdating ? 'disabled' : ''}>
                        <option value="member" ${userRole === 'member' ? 'selected' : ''}>Member</option>
                        <option value="guide" ${userRole === 'guide' ? 'selected' : ''}>Guide</option>
                        <option value="vice_admin" ${userRole === 'vice_admin' ? 'selected' : ''}>Vice-Admin</option>
                    </select>
                    <button class="btn-action ${user.is_suspended ? 'btn-activate' : 'btn-suspend'}" 
                            onclick="userManager.handleSuspensionToggle('${user.id}', ${!user.is_suspended})"
                            ${this.isUpdating ? 'disabled' : ''}>
                        ${user.is_suspended ? 'Activate' : 'Suspend'}
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Create HTML row for a master admin user
     */
    createMasterAdminRow(user) {
        const row = document.createElement('tr');
        row.setAttribute('data-user-id', user.id);
        row.className = user.is_suspended ? 'suspended-user' : '';

        const currentUser = AuthManager.getCurrentUser();
        const isCurrentUser = user.id === currentUser?.id;

        row.innerHTML = `
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div class="user-info">
                    <img src="${this.escapeHtml(user.profile_picture || '../img/default-avatar.jpg')}" 
                         alt="Profile picture for ${this.escapeHtml(user.username)}" 
                         class="user-avatar"
                         onerror="this.src='../img/default-avatar.jpg'">
                    <div>
                        <div class="user-name">
                            ${this.escapeHtml(user.username)}
                            ${isCurrentUser ? '<span class="text-sm text-blue-600 ml-2">(You)</span>' : ''}
                        </div>
                        <div class="user-email">${this.escapeHtml(user.email)}</div>
                    </div>
                </div>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <span class="role-badge ${this.getRoleClass('master')}">
                    Master Admin
                </span>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${user.is_suspended ? 'suspended' : 'active'}">
                    ${user.is_suspended ? 'Suspended' : 'Active'}
                </span>
            </td>
            <td class="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div class="action-buttons">
                    ${isCurrentUser ?
                        `<span class="text-sm text-gray-500 font-medium">System Administrator</span>` :
                        `<button class="btn-action ${user.is_suspended ? 'btn-activate' : 'btn-suspend'}"
                                onclick="userManager.handleSuspensionToggle('${user.id}', ${!user.is_suspended})"
                                ${this.isUpdating ? 'disabled' : ''}>
                            ${user.is_suspended ? 'Activate' : 'Suspend'}
                        </button>`
                    }
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Get display name for role
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'master': 'Master Admin',
            'vice_admin': 'Vice Admin',
            'guide': 'Guide',
            'member': 'Member'
        };
        return roleNames[role] || 'Member';
    }

    /**
     * Update user role with improved error handling and optimistic updates
     */
    async updateUserRole(userId, newRole) {
        if (!userId || !newRole) {
            this.showNotification('Invalid role update request', 'error');
            return;
        }
        const userIdNum = parseInt(userId, 10); // Convert userId to a number
        const originalUser = this.allUsers.find(u => u.id === userIdNum);
        if (!originalUser) {
            this.showNotification('User not found', 'error');
            return;
        }

        try {
            this.isUpdating = true;
            this.setUserRowLoading(userId, true);

            // Optimistic update
            const userIndex = this.allUsers.findIndex(u => u.id === userIdNum);
            const previousRole = this.getUserRole(originalUser);
            
            // Create updated user object
            const updatedUser = { ...originalUser };
            updatedUser.is_master = newRole === 'master';
            updatedUser.is_vice_admin = newRole === 'vice_admin';
            updatedUser.is_guide = newRole === 'guide';
            
            this.allUsers[userIndex] = updatedUser;
            this.filterUsers(this.currentSearchTerm);

            const response = await this.makeApiRequest(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole.toLowerCase() })
            });

            const serverUser = await response.json();
            this.allUsers[userIndex] = serverUser;
            this.filterUsers(this.currentSearchTerm);

            this.showNotification(`User role updated to ${this.getRoleDisplayName(newRole)}`, 'success');
            this.clearCache();

        } catch (error) {
            // Revert optimistic update
            const userIndex = this.allUsers.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                this.allUsers[userIndex] = originalUser;
                this.filterUsers(this.currentSearchTerm);
            }
            
            this.handleError('Failed to update user role', error);
        } finally {
            this.isUpdating = false;
            this.setUserRowLoading(userId, false);
        }
    }

    /**
     * Toggle user suspension with improved error handling
     */
    async toggleUserSuspension(userId, suspend) {
        if (!userId || typeof suspend !== 'boolean') {
            this.showNotification('Invalid suspension request', 'error');
            return;
        }
        const userIdNum = parseInt(userId, 10); // Convert userId to a number
        const originalUser = this.allUsers.find(u => u.id === userIdNum);
        if (!originalUser) {
            this.showNotification('User not found', 'error');
            return;
        }

        try {
            this.isUpdating = true;
            this.setUserRowLoading(userId, true);

            // Optimistic update
            const userIndex = this.allUsers.findIndex(u => u.id === userId);
            const updatedUser = { ...originalUser, is_suspended: suspend };
            this.allUsers[userIndex] = updatedUser;
            this.filterUsers(this.currentSearchTerm);

            const response = await this.makeApiRequest(`/api/admin/users/${userId}/suspension`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspend })
            });

            const serverUser = await response.json();
            this.allUsers[userIndex] = serverUser;
            this.filterUsers(this.currentSearchTerm);

            this.showNotification(`User ${suspend ? 'suspended' : 'activated'} successfully`, 'success');
            this.clearCache();

        } catch (error) {
            // Revert optimistic update
            const userIndex = this.allUsers.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                this.allUsers[userIndex] = originalUser;
                this.filterUsers(this.currentSearchTerm);
            }
            
            this.handleError(`Failed to ${suspend ? 'suspend' : 'activate'} user`, error);
        } finally {
            this.isUpdating = false;
            this.setUserRowLoading(userId, false);
        }
    }

    /**
     * Filter users with improved search functionality
     */
    filterUsers(searchTerm) {
        this.currentSearchTerm = searchTerm.toLowerCase().trim();

        if (!this.currentSearchTerm) {
            this.filteredUsers = [...this.allUsers];
        } else {
            this.filteredUsers = this.allUsers.filter(user => {
                const username = user.username?.toLowerCase() || '';
                const email = user.email?.toLowerCase() || '';
                const role = this.getUserRole(user).toLowerCase();
                
                return username.includes(this.currentSearchTerm) ||
                       email.includes(this.currentSearchTerm) ||
                       role.includes(this.currentSearchTerm);
            });
        }

        this.renderUsers(this.filteredUsers);
    }

    /**
     * Fetch users with retry mechanism and caching
     */
    async fetchUsers() {
        const cacheKey = 'users';
        
        try {
            this.isLoading = true;

            const response = await this.makeApiRequest('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${AuthManager.getAuthToken()}` }
            });

            const users = await response.json();
            
            if (!Array.isArray(users)) {
                throw new Error('Invalid users data received');
            }

            this.allUsers = users;
            this.filteredUsers = [...users];
            this.cache.set(cacheKey, { data: users, timestamp: Date.now() });
            
            this.renderUsers();
            await this.fetchDashboardStats();
            
        } catch (error) {
            // Try to use cached data
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
                this.allUsers = cached.data;
                this.filteredUsers = [...cached.data];
                this.renderUsers();
                this.showNotification('Using cached data - some information may be outdated', 'warning');
            } else {
                this.handleError('Failed to load users', error);
            }
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Fetch dashboard statistics with fallback
     */
    async fetchDashboardStats() {
        try {
            const response = await this.makeApiRequest('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${AuthManager.getAuthToken()}` }
            });

            const stats = await response.json();
            this.updateDashboardStats(stats);
            
        } catch (error) {
            console.warn('Failed to fetch dashboard stats:', error);
            this.calculateStatsFromUsers();
        }
    }

    /**
     * Update dashboard statistics in the UI
     */
    updateDashboardStats(stats) {
        const updates = [
            { id: 'totalUsers', value: stats.total_users },
            { id: 'newUsersMonth', value: stats.new_users_month },
            { id: 'totalPosts', value: stats.total_posts },
            { id: 'viceAdminCount', value: stats.vice_admins_count }
        ];

        updates.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element && typeof value === 'number') {
                element.textContent = value.toLocaleString();
            }
        });
    }

    /**
     * Calculate basic stats from current user data
     */
    calculateStatsFromUsers() {
        if (!this.allUsers.length) return;

        const totalUsers = this.allUsers.length;
        const viceAdminCount = this.allUsers.filter(user => user.is_vice_admin && !user.is_master).length;

        document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
        document.getElementById('viceAdminCount').textContent = viceAdminCount.toLocaleString();

        // Set placeholders for unavailable stats
        const newUsersElement = document.getElementById('newUsersMonth');
        const totalPostsElement = document.getElementById('totalPosts');
        
        if (newUsersElement && newUsersElement.textContent === '0') {
            newUsersElement.textContent = '--';
        }
        if (totalPostsElement && totalPostsElement.textContent === '0') {
            totalPostsElement.textContent = '--';
        }
    }

    /**
     * Make API request with retry logic and better error handling
     */
    async makeApiRequest(url, options = {}) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (!window.AuthAPI) {
                    throw new Error('AuthAPI not available');
                }

                const response = await AuthAPI.request(url, options);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                return response;
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError;
    }

    /**
     * Utility functions
     */
    setUserRowLoading(userId, loading) {
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            if (loading) {
                row.classList.add('opacity-50', 'pointer-events-none');
            } else {
                row.classList.remove('opacity-50', 'pointer-events-none');
            }
        }
    }

    updateUserCounts() {
        const masterCount = this.allUsers.filter(user => user.is_master).length;
        const viceAdminCount = this.allUsers.filter(user => user.is_vice_admin && !user.is_master).length;
        const guideCount = this.allUsers.filter(user => user.is_guide && !user.is_master && !user.is_vice_admin).length;
        const memberCount = this.allUsers.filter(user => !user.is_master && !user.is_vice_admin && !user.is_guide).length;

        const totalUsers = this.allUsers.length;
        document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
        document.getElementById('viceAdminCount').textContent = viceAdminCount.toLocaleString();
        
        const userCountBadge = document.getElementById('user-count-badge');
        if (userCountBadge) {
            userCountBadge.textContent = totalUsers.toLocaleString();
        }
    }

    updateSearchResults(count) {
        const searchInput = document.getElementById('userSearch');
        if (searchInput && this.currentSearchTerm) {
            searchInput.setAttribute('title', `Found ${count} users`);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            } else {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
        }
    }

    updateUI() {
        // Update current user info in sidebar
        const user = AuthManager.getCurrentUser();
        if (user) {
            const profileImg = document.getElementById('sidebar-profile-picture');
            const username = document.getElementById('sidebar-username');
            
            if (profileImg && user.profile_picture) {
                profileImg.src = user.profile_picture;
            }
            if (username && user.username) {
                username.textContent = user.username;
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleError(message, error) {
        console.error(message, error);
        this.showNotification(message, 'error');
    }

    handleWindowFocus() {
        // Refresh data when window gains focus (user might have been away)
        if (Date.now() - this.lastFetch > 60000) { // 1 minute
            this.fetchUsers();
        }
    }

    handleOnline() {
        this.showNotification('Connection restored', 'success');
        this.fetchUsers();
    }

    handleOffline() {
        this.showNotification('You are offline. Some features may not work.', 'warning');
    }

    showNotification(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 shadow-lg transform transition-all duration-300 ease-in-out translate-x-full`;
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.classList.add(colors[type] || colors.info);
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize the enhanced user manager
const userManager = new UserManager();

// Enhanced initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await userManager.init();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        userManager.showNotification('Dashboard initialization failed', 'error');
    }
});