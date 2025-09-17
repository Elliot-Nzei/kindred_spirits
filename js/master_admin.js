class UserManager {
    constructor() {
        this.allUsers = [];
        this.filteredUsers = {
            viceAdmin: [],
            guide: [],
            member: []
        };
        this.currentSearchTerm = '';
        this.isUpdating = false; // Prevent concurrent updates
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
            viceAdmin: document.getElementById('viceAdminList'),
            guide: document.getElementById('guideList'),
            member: document.getElementById('memberList')
        };

        // Clear existing content
        Object.values(listsToUpdate).forEach(list => {
            if (list) list.innerHTML = '';
        });

        // Reset filtered users
        this.filteredUsers = {
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
                    // Master admin is handled separately, not part of dynamic lists
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
                <span class="role-badge role-${userRole.toLowerCase().replace(/\s+/g, '-')}">
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
            const listElement = document.getElementById(`${role}List`);
            if (listElement) {
                listElement.innerHTML = '';
                filteredCategories[role].forEach(user => {
                    listElement.appendChild(this.createUserRow(user));
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
            const response = await AuthAPI.request('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getAuthToken()}` // Use AuthManager
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.statusText}`);
            }

            const users = await response.json();
            this.renderUsers(users);
            
        } catch (error) {
            console.error('Error fetching users:', error);
            this.showNotification('Failed to load users', 'error');
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
        // Assuming you have elements like totalUsers, newUsersMonth, totalPosts, viceAdminCount
        // These would need to be updated based on your stats API or by counting from allUsers
        // For now, let's just update the counts for viceAdmin, guide, and member sections
        const viceAdminCountElement = document.getElementById('viceAdminCount');
        if (viceAdminCountElement) {
            viceAdminCountElement.textContent = this.filteredUsers.viceAdmin.length;
        }

        const guideCountElement = document.getElementById('guideCount'); // Assuming you have this ID
        if (guideCountElement) {
            guideCountElement.textContent = this.filteredUsers.guide.length;
        }

        const memberCountElement = document.getElementById('memberCount'); // Assuming you have this ID
        if (memberCountElement) {
            memberCountElement.textContent = this.filteredUsers.member.length;
        }
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
document.addEventListener('DOMContentLoaded', () => {
    userManager.fetchUsers();
    
    // Setup search functionality
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            userManager.filterUsers(e.target.value);
        });
    }
});