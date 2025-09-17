// Enhanced Master Admin Dashboard User Management
// Fixes the user row duplication issue during role updates

class UserManager {
    constructor() {
        this.allUsers = [];
        this.filteredUsers = {
            masterAdmin: [],
            viceAdmin: [],
            guide: [],
            member: []
        };
        this.currentSearchTerm = '';
        this.isUpdating = false; // Prevent concurrent updates
    }

    /**
     * Get role color class
     * @param {string} role - The user role
     * @returns {string} - Tailwind CSS color class
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
     * Main render function - single source of truth for UI updates
     * @param {Array} users - Array of user objects
     * @param {boolean} preserveSearch - Whether to maintain current search state
     */
    renderUsers(users, preserveSearch = false) {
        if (this.isUpdating) return; // Prevent concurrent renders
        
        this.allUsers = [...users]; // Deep copy to prevent reference issues
        
        // Clear only dynamic user lists (preserve master admin list)
        const listsToUpdate = {
            masterAdmin: document.getElementById('masterAdminList'),
            viceAdmin: document.getElementById('viceAdminList'),
            guide: document.getElementById('guideList'),
            member: document.getElementById('memberList')
        };

        // Clear existing content for all lists
        Object.values(listsToUpdate).forEach(list => {
            if (list) list.innerHTML = '';
        });

        // Reset filtered users
        this.filteredUsers = {
            masterAdmin: [],
            viceAdmin: [],
            guide: [],
            member: []
        };

        // Categorize and render users
        users.forEach(user => {
            const userRow = this.createUserRow(user);
            
            let userRole = 'member';
            if (user.is_master) {
                userRole = 'master';
            } else if (user.is_vice_admin) {
                userRole = 'vice_admin';
            } else if (user.is_guide) {
                userRole = 'guide';
            }

            switch(userRole) {
                case 'master':
                    this.filteredUsers.masterAdmin.push(user);
                    if (listsToUpdate.masterAdmin) {
                        // Master admin rows should not be editable (no role selector)
                        const masterRow = this.createMasterAdminRow(user);
                        listsToUpdate.masterAdmin.appendChild(masterRow);
                    }
                    break;
                case 'vice_admin':
                    this.filteredUsers.viceAdmin.push(user);
                    if (listsToUpdate.viceAdmin) {
                        listsToUpdate.viceAdmin.appendChild(userRow);
                    }
                    break;
                case 'guide':
                    this.filteredUsers.guide.push(user);
                    if (listsToUpdate.guide) {
                        listsToUpdate.guide.appendChild(userRow);
                    }
                    break;
                case 'member':
                    this.filteredUsers.member.push(user);
                    if (listsToUpdate.member) {
                        listsToUpdate.member.appendChild(userRow);
                    }
                    break;
            }
        });

        // Apply search filter if one exists and we want to preserve it
        if (preserveSearch && this.currentSearchTerm) {
            this.filterUsers(this.currentSearchTerm);
        }

        // Update counts
        this.updateUserCounts();
    }

    /**
     * Create HTML row for a user
     * @param {Object} user - User object
     * @returns {HTMLElement} - User row element
     */
    createUserRow(user) {
        const row = document.createElement('tr');
        row.setAttribute('data-user-id', user.id);
        // Determine the user's role based on boolean flags
        let userRole = 'member';
        if (user.is_master) {
            userRole = 'master';
        } else if (user.is_vice_admin) {
            userRole = 'vice_admin';
        } else if (user.is_guide) {
            userRole = 'guide';
        }

        row.className = user.is_suspended ? 'suspended-user' : ''; // Use user.is_suspended

        row.innerHTML = `
            <td>
                <div class="user-info">
                    <img src="${user.profile_picture || '../img/default-avatar.jpg'}" 
                         alt="Profile" class="user-avatar">
                    <div>
                        <div class="user-name">${this.escapeHtml(user.username)}</div>
                        <div class="user-email">${this.escapeHtml(user.email)}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge ${this.getRoleClass(userRole)}">
                    ${userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ')}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.is_suspended ? 'suspended' : 'active'}">
                    ${user.is_suspended ? 'Suspended' : 'Active'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <select class="role-selector" onchange="userManager.updateUserRole('${user.id}', this.value)">
                        <option value="member" ${userRole === 'member' ? 'selected' : ''}>Member</option>
                        <option value="guide" ${userRole === 'guide' ? 'selected' : ''}>Guide</option>
                        <option value="vice_admin" ${userRole === 'vice_admin' ? 'selected' : ''}>Vice-Admin</option>
                    </select>
                    <button class="btn-action ${user.is_suspended ? 'btn-activate' : 'btn-suspend'}" 
                            onclick="userManager.toggleUserSuspension('${user.id}', ${!user.is_suspended})">
                        ${user.is_suspended ? 'Activate' : 'Suspend'}
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Create HTML row for a master admin user (non-editable)
     * @param {Object} user - User object
     * @returns {HTMLElement} - User row element
     */
    createMasterAdminRow(user) {
        const row = document.createElement('tr');
        row.setAttribute('data-user-id', user.id);
        row.className = user.is_suspended ? 'suspended-user' : '';

        row.innerHTML = `
            <td>
                <div class="user-info">
                    <img src="${user.profile_picture || '../img/default-avatar.jpg'}" 
                         alt="Profile" class="user-avatar">
                    <div>
                        <div class="user-name">${this.escapeHtml(user.username)}</div>
                        <div class="user-email">${this.escapeHtml(user.email)}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge ${this.getRoleClass('master')}">
                    Master Admin
                </span>
            </td>
            <td>
                <span class="status-badge ${user.is_suspended ? 'suspended' : 'active'}">
                    ${user.is_suspended ? 'Suspended' : 'Active'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <span class="text-sm text-gray-500 font-medium">System Administrator</span>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Update a single user's row in real-time without full re-render
     * @param {string} userId - User ID to update
     * @param {Object} updatedUser - Updated user object
     */
    async updateUserRow(userId, updatedUser) {
        if (this.isUpdating) return; // Prevent concurrent updates
        
        this.isUpdating = true;

        try {
            // Find and update user in allUsers array
            const userIndex = this.allUsers.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                console.warn(`User ${userId} not found in allUsers`);
                await this.fetchUsers(); // Fallback to full refresh
                return;
            }

            // Update user data
            this.allUsers[userIndex] = { ...this.allUsers[userIndex], ...updatedUser };
            localStorage.setItem('allUsers', JSON.stringify(this.allUsers));


            // Remove old row from DOM
            const oldRow = document.querySelector(`tr[data-user-id="${userId}"]`);
            if (oldRow) {
                // Add fade-out animation
                oldRow.style.transition = 'opacity 0.3s ease';
                oldRow.style.opacity = '0';
                
                setTimeout(() => {
                    if (oldRow.parentNode) {
                        oldRow.parentNode.removeChild(oldRow);
                    }
                }, 300);
            }

            // Wait for fade-out to complete before re-rendering
            setTimeout(() => {
                // Re-render with updated data, preserving search state
                this.renderUsers(this.allUsers, true);
                
                // Highlight the updated user row
                this.highlightUpdatedRow(userId);
                
                this.isUpdating = false;
            }, 350);

        } catch (error) {
            console.error('Error updating user row:', error);
            this.isUpdating = false;
            // Fallback to full refresh on error
            await this.fetchUsers();
        }
    }

    /**
     * Highlight updated user row with animation
     * @param {string} userId - User ID to highlight
     */
    highlightUpdatedRow(userId) {
        setTimeout(() => {
            const newRow = document.querySelector(`tr[data-user-id="${userId}"]`);
            if (newRow) {
                newRow.classList.add('row-updated');
                newRow.style.backgroundColor = '#e8f5e8';
                
                setTimeout(() => {
                    newRow.style.transition = 'background-color 1s ease';
                    newRow.style.backgroundColor = '';
                    setTimeout(() => {
                        newRow.classList.remove('row-updated');
                        newRow.style.transition = '';
                    }, 1000);
                }, 100);
            }
        }, 100);
    }

    /**
     * Update user role via API
     * @param {string} userId - User ID
     * @param {string} newRole - New role
     */
    async updateUserRole(userId, newRole) {
        try {
            // Show loading state
            this.setUserRowLoading(userId, true);

            const response = await AuthAPI.request(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole.toLowerCase() }) // Ensure role is lowercase for backend
            });

            if (!response.ok) {
                throw new Error(`Failed to update role: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Update user row with new data
            await this.updateUserRow(userId, result); // Pass the full updated user object from the server

            // Show success message
            this.showNotification(`User role updated to ${newRole}`, 'success');

        } catch (error) {
            console.error('Error updating user role:', error);
            this.showNotification('Failed to update user role', 'error');
            
            // Reset the selector to original value
            const selector = document.querySelector(`tr[data-user-id="${userId}"] .role-selector`);
            if (selector) {
                const originalUser = this.allUsers.find(user => user.id === userId);
                if (originalUser) {
                    selector.value = originalUser.role;
                }
            }
        } finally {
            this.setUserRowLoading(userId, false);
        }
    }

    /**
     * Toggle user suspension status
     * @param {string} userId - User ID
     * @param {boolean} suspend - Whether to suspend (true) or activate (false)
     */
    async toggleUserSuspension(userId, suspend) {
        try {
            this.setUserRowLoading(userId, true);

            const response = await AuthAPI.request(`/api/admin/users/${userId}/suspension`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ suspend: suspend })
            });

            if (!response.ok) {
                throw new Error(`Failed to ${suspend ? 'suspend' : 'activate'} user: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Update user row
            await this.updateUserRow(userId, result); // Pass the full updated user object from the server

            // Show success message
            this.showNotification(`User ${suspend ? 'suspended' : 'activated'} successfully`, 'success');

        } catch (error) {
            console.error('Error toggling user suspension:', error);
            this.showNotification(`Failed to ${suspend ? 'suspend' : 'activate'} user`, 'error');
        } finally {
            this.setUserRowLoading(userId, false);
        }
    }

    /**
     * Filter users based on search term
     * @param {string} searchTerm - Search term
     */
    filterUsers(searchTerm) {
        this.currentSearchTerm = searchTerm.toLowerCase();

        const filterUserArray = (users) => {
            return users.filter(user => 
                user.username.toLowerCase().includes(this.currentSearchTerm) || // Use username
                user.email.toLowerCase().includes(this.currentSearchTerm)
            );
        };

        // Filter each role category
        const filteredCategories = {
            masterAdmin: filterUserArray(this.allUsers.filter(user => 
                user.is_master
            )),
            viceAdmin: filterUserArray(this.allUsers.filter(user => 
                user.is_vice_admin
            )),
            guide: filterUserArray(this.allUsers.filter(user => 
                user.is_guide
            )),
            member: filterUserArray(this.allUsers.filter(user => 
                !user.is_master && !user.is_vice_admin && !user.is_guide
            ))
        };

        // Update DOM
        Object.keys(filteredCategories).forEach(role => {
            let listElement;
            if (role === 'masterAdmin') {
                listElement = document.getElementById('masterAdminList');
            } else {
                listElement = document.getElementById(`${role}List`);
            }
            
            if (listElement) {
                listElement.innerHTML = '';
                filteredCategories[role].forEach(user => {
                    if (role === 'masterAdmin') {
                        listElement.appendChild(this.createMasterAdminRow(user));
                    } else {
                        listElement.appendChild(this.createUserRow(user));
                    }
                });
            }
        });

        // Update filteredUsers state
        this.filteredUsers = filteredCategories;
    }

    /**
     * Fetch users from API
     */
    async fetchUsers() {
        try {
            const cachedUsers = localStorage.getItem('allUsers');
            if (cachedUsers) {
                this.renderUsers(JSON.parse(cachedUsers));
            } else {
                const response = await AuthAPI.request('/api/admin/users', {
                    headers: {
                        'Authorization': `Bearer ${AuthManager.getAuthToken()}` // Use AuthManager
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.statusText}`);
                }

                const users = await response.json();
                localStorage.setItem('allUsers', JSON.stringify(users));
                this.renderUsers(users);
            }
            
            // Fetch and update dashboard statistics
            await this.fetchDashboardStats();
            
        } catch (error) {
            console.error('Error fetching users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    /**
     * Fetch dashboard statistics from API
     */
    async fetchDashboardStats() {
        try {
            const response = await AuthAPI.request('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.statusText}`);
            }

            const stats = await response.json();
            this.updateDashboardStats(stats);
            
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Fall back to calculating stats from available data
            this.calculateStatsFromUsers();
        }
    }

    /**
     * Update dashboard statistics in the UI
     * @param {Object} stats - Statistics object from API
     */
    updateDashboardStats(stats) {
        // Update main dashboard stats
        const totalUsersElement = document.getElementById('totalUsers');
        if (totalUsersElement && stats.total_users !== undefined) {
            totalUsersElement.textContent = stats.total_users.toLocaleString();
        }

        const newUsersMonthElement = document.getElementById('newUsersMonth');
        if (newUsersMonthElement && stats.new_users_month !== undefined) {
            newUsersMonthElement.textContent = stats.new_users_month.toLocaleString();
        }

        const totalPostsElement = document.getElementById('totalPosts');
        if (totalPostsElement && stats.total_posts !== undefined) {
            totalPostsElement.textContent = stats.total_posts.toLocaleString();
        }

        const viceAdminCountElement = document.getElementById('viceAdminCount');
        if (viceAdminCountElement && stats.vice_admins_count !== undefined) {
            viceAdminCountElement.textContent = stats.vice_admins_count.toLocaleString();
        }
    }

    /**
     * Calculate basic stats from current user data (fallback method)
     */
    calculateStatsFromUsers() {
        if (!this.allUsers.length) return;

        // Calculate total users
        const totalUsersElement = document.getElementById('totalUsers');
        if (totalUsersElement) {
            totalUsersElement.textContent = this.allUsers.length.toLocaleString();
        }

        // Calculate vice admin count
        const viceAdminCount = this.allUsers.filter(user => user.is_vice_admin).length;
        const viceAdminCountElement = document.getElementById('viceAdminCount');
        if (viceAdminCountElement) {
            viceAdminCountElement.textContent = viceAdminCount.toLocaleString();
        }

        // For new users this month and total posts, we need backend data
        // Set placeholder values or fetch from backend
        const newUsersMonthElement = document.getElementById('newUsersMonth');
        if (newUsersMonthElement && newUsersMonthElement.textContent === '0') {
            newUsersMonthElement.textContent = '--';
        }

        const totalPostsElement = document.getElementById('totalPosts');
        if (totalPostsElement && totalPostsElement.textContent === '0') {
            totalPostsElement.textContent = '--';
        }
    }

    /**
     * Utility functions
     */
    setUserRowLoading(userId, loading) {
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            if (loading) {
                row.classList.add('loading');
                row.style.opacity = '0.6';
            } else {
                row.classList.remove('loading');
                row.style.opacity = '1';
            }
        }
    }

    updateUserCounts() {
        // Update the vice admin count in the main dashboard stats
        const viceAdminCountElement = document.getElementById('viceAdminCount');
        if (viceAdminCountElement) {
            viceAdminCountElement.textContent = this.filteredUsers.viceAdmin.length.toLocaleString();
        }

        // Update total users count with current loaded users
        const totalUsersElement = document.getElementById('totalUsers');
        if (totalUsersElement && this.allUsers.length > 0) {
            totalUsersElement.textContent = this.allUsers.length.toLocaleString();
        }

        // If you have separate count elements for each section (not in the HTML you provided)
        const guideCountElement = document.getElementById('guideCount');
        if (guideCountElement) {
            guideCountElement.textContent = this.filteredUsers.guide.length.toLocaleString();
        }

        const memberCountElement = document.getElementById('memberCount');
        if (memberCountElement) {
            memberCountElement.textContent = this.filteredUsers.member.length.toLocaleString();
        }

        // Calculate and display additional stats from loaded users
        this.updateCalculatedStats();
    }

    /**
     * Update calculated statistics from current user data
     */
    updateCalculatedStats() {
        if (!this.allUsers.length) return;

        // Calculate users by role
        const roleStats = {
            master: this.allUsers.filter(user => user.is_master).length,
            viceAdmin: this.allUsers.filter(user => user.is_vice_admin).length,
            guide: this.allUsers.filter(user => user.is_guide).length,
            member: this.allUsers.filter(user => !user.is_master && !user.is_vice_admin && !user.is_guide).length,
            suspended: this.allUsers.filter(user => user.is_suspended).length,
            active: this.allUsers.filter(user => !user.is_suspended).length
        };

        // Update main stats if backend data isn't available
        const totalUsersElement = document.getElementById('totalUsers');
        if (totalUsersElement) {
            totalUsersElement.textContent = this.allUsers.length.toLocaleString();
        }

        const viceAdminCountElement = document.getElementById('viceAdminCount');
        if (viceAdminCountElement) {
            viceAdminCountElement.textContent = roleStats.viceAdmin.toLocaleString();
        }

        // Log stats for debugging
        console.log('User Statistics:', {
            total: this.allUsers.length,
            ...roleStats
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getAuthToken() {
        return AuthManager.getAuthToken(); // Use AuthManager
    }

    showNotification(message, type = 'info') {
        // Implementation depends on your notification system
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Example implementation with toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize the user manager
const userManager = new UserManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading state
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    }

    try {
        // Initialize user manager and load data
        await userManager.fetchUsers();
        
        // Setup search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                userManager.filterUsers(e.target.value);
            });
        }

        // Setup logout functionality
        const logoutButton = document.querySelector('[data-logout]');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await AuthManager.logout();
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    userManager.showNotification('Error during logout', 'error');
                }
            });
        }

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        userManager.showNotification('Failed to initialize dashboard', 'error');
    } finally {
        // Hide loading state
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('flex');
        }
    }
});