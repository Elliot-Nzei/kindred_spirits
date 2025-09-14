// profile.js - Complete Profile Management System for Social Platform



// Profile Manager
const ProfileManager = {
    currentProfile: null,
    currentUser: null,
    isOwnProfile: false,
    posts: [],
    currentPage: 0,
    pageSize: 20,
    hasMore: true,
    activeTab: 'posts',

    // Initialize profile
    async init() {
        if (!window.AuthManager?.isAuthenticated()) {
            window.location.href = '/index.html';
            return;
        }

        this.currentUser = window.AuthManager.getCurrentUser();
        await this.loadProfile();
        this.attachEventListeners();
        this.setupTabs();
    },

    // Load profile data
    async loadProfile() {
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('user');
        
        // Determine if viewing own profile or someone else's
        this.isOwnProfile = !username || username === this.currentUser.username;
        
        try {
            const endpoint = username 
                ? `/api/users/${username}` 
                : '/api/users/me';
            
            const response = await window.AuthAPI.request(endpoint);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showUserNotFound();
                    return;
                }
                throw new Error('Failed to load profile');
            }

            this.currentProfile = await response.json();
            this.renderProfile();
            await this.loadUserPosts();
            await this.loadStats();

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile');
        }
    },

    // Render profile information
    renderProfile() {
        const defaultAvatar = '/img/default-avatar.jpg';
        const profilePicture = this.currentProfile.profile_picture 
            ? `${API_BASE_URL}${this.currentProfile.profile_picture}` 
            : defaultAvatar;

        // Update profile header
        const profileHeader = document.getElementById('profile-header');
        if (profileHeader) {
            profileHeader.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-md">
        <div class="flex flex-col items-center sm:flex-row sm:items-start">
            <!-- Avatar -->
            <div class="relative flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                <img src="${profilePicture}" 
                     alt="${this.currentProfile.username}'s Profile" 
                     class="w-32 h-32 rounded-full border-4 border-primary-light object-cover shadow-lg ${this.isOwnProfile ? 'cursor-pointer' : ''}"
                     onerror="this.src='${defaultAvatar}'; this.onerror=null;"
                     ${this.isOwnProfile ? `onclick="ProfileManager.handleProfileImageClick('${profilePicture}')"` : ''}>
            </div>
            
            <!-- Name, Username, and Actions -->
            <div class="flex-1 text-center sm:text-left">
                <div class="flex flex-col sm:flex-row items-center justify-center sm:justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-text-primary">
                            ${this.currentProfile.full_name || this.currentProfile.username}
                        </h1>
                        <p class="text-text-secondary text-lg">@${this.currentProfile.username}</p>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex space-x-2 mt-4 sm:mt-0">
                        ${this.isOwnProfile ? `
                            
                        ` : `
                            <button onclick="ProfileManager.toggleFollow()" 
                                    id="follow-btn"
                                    class="px-4 py-2 ${this.currentProfile.is_following 
                                        ? 'border border-border-light' 
                                        : 'bg-primary text-white'} rounded-lg hover:opacity-90 transition-opacity">
                                ${this.currentProfile.is_following ? 'Following' : 'Follow'}
                            </button>
                            <button onclick="ProfileManager.sendMessage()" 
                                    class="px-4 py-2 border border-border-light rounded-lg hover:bg-surface-hover transition-colors">
                                Message
                            </button>
                        `}
                    </div>
                </div>
                
                <!-- Bio -->
                ${this.currentProfile.bio ? `
                    <p class="mt-4 text-text-primary">${this.formatBio(this.currentProfile.bio)}</p>
                ` : ''}
                
                <!-- Additional Info -->
                <div class="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-text-secondary">
                    ${this.currentProfile.location ? `
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            ${this.currentProfile.location}
                        </span>
                    ` : ''}
                    ${this.currentProfile.website ? `
                        <a href="${this.currentProfile.website}" target="_blank" 
                           class="flex items-center hover:text-primary transition-colors">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                            </svg>
                            ${new URL(this.currentProfile.website).hostname}
                        </a>
                    ` : ''}
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Joined ${this.formatDate(this.currentProfile.joined_date)}
                    </span>
                </div>
                
                <!-- Stats -->
                <div class="mt-6 flex justify-center sm:justify-start space-x-6">
                    <div class="cursor-pointer hover:text-primary transition-colors" onclick="ProfileManager.showFollowers()">
                        <span class="font-bold text-text-primary">${this.formatNumber(this.currentProfile.followers_count)}</span>
                        <span class="text-text-secondary ml-1">Followers</span>
                    </div>
                    <div class="cursor-pointer hover:text-primary transition-colors" onclick="ProfileManager.showFollowing()">
                        <span class="font-bold text-text-primary">${this.formatNumber(this.currentProfile.following_count)}</span>
                        <span class="text-text-secondary ml-1">Following</span>
                    </div>
                    <div>
                        <span class="font-bold text-text-primary">${this.formatNumber(this.currentProfile.posts_count)}</span>
                        <span class="text-text-secondary ml-1">Posts</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
            `
        }
        // Manage visibility of mobile edit profile FAB
        const mobileEditFab = document.getElementById('mobile-edit-profile-fab');
        if (mobileEditFab) {
            if (this.isOwnProfile) {
                mobileEditFab.classList.remove('hidden');
            } else {
                mobileEditFab.classList.add('hidden');
            }
        }
    },

    // Load user posts
    async loadUserPosts(append = false) {
        if (!append) {
            this.currentPage = 0; // Reset current page for fresh load
            this.hasMore = true; // Assume there's more content for a fresh load
        }
        if (this.isLoading || (!this.hasMore && append)) return; // Prevent multiple loads or loading when no more content

        this.isLoading = true; // Set loading state

        try {
            const endpoint = `/api/users/${this.currentProfile.username}/posts?skip=${this.currentPage * this.pageSize}&limit=${this.pageSize}`;
            const response = await window.AuthAPI.request(endpoint);
            
            if (!response.ok) throw new Error('Failed to load posts');
            
            const posts = await response.json();
            
            if (posts.length < this.pageSize) {
                this.hasMore = false;
            }
            
            if (append) {
                this.posts.push(...posts);
            } else {
                this.posts = posts;
            }
            
            this.renderPosts(posts, append);
            this.currentPage++;
            
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            this.isLoading = false; // Reset loading state
        }
    },

    // Load followers
    async loadFollowers() {
        try {
            const endpoint = `/api/users/${this.currentProfile.username}/followers`;
            const response = await window.AuthAPI.request(endpoint);
            if (!response.ok) throw new Error('Failed to load followers');
            const followers = await response.json();
            this.renderFollowers(followers);
        } catch (error) {
            console.error('Error loading followers:', error);
            document.getElementById('profile-followers').innerHTML = '<p class="text-center text-red-500">Failed to load followers.</p>';
        }
    },

    // Load following
    async loadFollowing() {
        try {
            const endpoint = `/api/users/${this.currentProfile.username}/following`;
            const response = await window.AuthAPI.request(endpoint);
            if (!response.ok) throw new Error('Failed to load following');
            const following = await response.json();
            this.renderFollowing(following);
        } catch (error) {
            console.error('Error loading following:', error);
            document.getElementById('profile-following').innerHTML = '<p class="text-center text-red-500">Failed to load following.</p>';
        }
    },

    // Render posts
    renderPosts(posts, append = false) {
        const postsContainer = document.getElementById('profile-posts');
        if (!postsContainer) return;
        
        if (!append) {
            postsContainer.innerHTML = '';
        }
        
        if (posts.length === 0 && !append) {
            postsContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg class="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                    <p class="text-text-secondary">No posts yet</p>
                </div>
            `;
            return;
        }
        
        posts.forEach(post => {
            const postElement = window.FeedManager.createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    },

    // Render followers
    renderFollowers(followers) {
        const followersContainer = document.getElementById('profile-followers');
        if (!followersContainer) return;

        if (followers.length === 0) {
            followersContainer.innerHTML = '<p class="text-center text-text-secondary">No followers yet.</p>';
            return;
        }

        followersContainer.innerHTML = followers.map(user => `
            <div class="flex items-center space-x-3 card p-3">
                <img src="${user.profile_picture ? `${API_BASE_URL}${user.profile_picture}` : '/img/default-avatar.jpg'}"
                     alt="${user.username}'s Profile"
                     class="w-10 h-10 rounded-full object-cover">
                <div>
                    <a href="/pages/soul_profile.html?user=${user.username}" class="font-medium text-text-primary hover:text-primary">${user.full_name || user.username}</a>
                    <p class="text-sm text-text-secondary">@${user.username}</p>
                </div>
            </div>
        `).join('');
    },

    // Render following
    renderFollowing(following) {
        const followingContainer = document.getElementById('profile-following');
        if (!followingContainer) return;

        if (following.length === 0) {
            followingContainer.innerHTML = '<p class="text-center text-text-secondary">Not following anyone yet.</p>';
            return;
        }

        followingContainer.innerHTML = following.map(user => `
            <div class="flex items-center space-x-3 card p-3">
                <img src="${user.profile_picture ? `${API_BASE_URL}${user.profile_picture}` : '/img/default-avatar.jpg'}"
                     alt="${user.username}'s Profile"
                     class="w-10 h-10 rounded-full object-cover">
                <div>
                    <a href="/pages/soul_profile.html?user=${user.username}" class="font-medium text-text-primary hover:text-primary">${user.full_name || user.username}</a>
                    <p class="text-sm text-text-secondary">@${user.username}</p>
                </div>
            </div>
        `).join('');
    },


    // Load stats
    async loadStats() {
        if (!this.isOwnProfile) return; 
        
        try {
            const response = await window.AuthAPI.request('/api/stats/overview');
            if (!response.ok) throw new Error('Failed to load stats');
            
            const stats = await response.json();
            this.renderStats(stats);
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    // Render stats
    renderStats(stats) {
        const statsContainer = document.getElementById('profile-stats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-primary">${this.formatNumber(stats.total_views)}</div>
                    <div class="text-sm text-text-secondary">Total Views</div>
                </div>
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-accent">${this.formatNumber(stats.total_likes)}</div>
                    <div class="text-sm text-text-secondary">Total Likes</div>
                </div>
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-secondary">${this.formatNumber(stats.total_comments)}</div>
                    <div class="text-sm text-text-secondary">Total Comments</div>
                </div>
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-success">${this.formatNumber(stats.total_followers)}</div>
                    <div class="text-sm text-text-secondary">Followers</div>
                </div>
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-warning">${this.formatNumber(stats.total_following)}</div>
                    <div class="text-sm text-text-secondary">Following</div>
                </div>
                <div class="card p-4 text-center">
                    <div class="text-2xl font-bold text-info">${this.formatNumber(stats.total_posts)}</div>
                    <div class="text-sm text-text-secondary">Posts</div>
                </div>
            </div>
        `;
    },

    // Setup tabs
    setupTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    },

    // Switch tabs
    switchTab(tab) {
        this.activeTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('[data-tab]').forEach(button => {
            if (button.dataset.tab === tab) {
                button.classList.add('border-primary', 'text-primary');
                button.classList.remove('border-transparent', 'text-text-secondary');
            } else {
                button.classList.remove('border-primary', 'text-primary');
                button.classList.add('border-transparent', 'text-text-secondary');
            }
        });
        
        // Show/hide tab content
        document.querySelectorAll('[data-tab-content]').forEach(content => {
            if (content.dataset.tabContent === tab) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });

        // Load data for the active tab
        if (tab === 'followers') {
            this.loadFollowers();
        } else if (tab === 'following') {
            this.loadFollowing();
        } else if (tab === 'posts') {
            this.loadUserPosts();
        } else if (tab === 'stats') {
            this.loadStats();
        }
    },

    // Toggle follow
    async toggleFollow() {
        if (!this.currentProfile) return; 
        
        try {
            const endpoint = this.currentProfile.is_following 
                ? `/api/users/${this.currentProfile.username}/unfollow` 
                : `/api/users/${this.currentProfile.username}/follow`;
            
            const method = this.currentProfile.is_following ? 'DELETE' : 'POST';
            
            const response = await window.AuthAPI.request(endpoint, {
                method: method
            });
            
            if (response.ok) {
                this.currentProfile.is_following = !this.currentProfile.is_following;
                this.updateFollowButton();
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    },

    // Update follow button
    updateFollowButton() {
        const followBtn = document.getElementById('follow-btn');
        if (!followBtn) return;
        
        if (this.currentProfile.is_following) {
            followBtn.textContent = 'Following';
            followBtn.classList.remove('bg-primary', 'text-white');
            followBtn.classList.add('border', 'border-border-light');
        } else {
            followBtn.textContent = 'Follow';
            followBtn.classList.add('bg-primary', 'text-white');
            followBtn.classList.remove('border', 'border-border-light');
        }
    },

    // Open edit modal
    openEditModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) return; 
        
        // Populate form with current data
        document.getElementById('edit-full-name').value = this.currentProfile.full_name || '';
        document.getElementById('edit-bio').value = this.currentProfile.bio || '';
        document.getElementById('edit-location').value = this.currentProfile.location || '';
        document.getElementById('edit-website').value = this.currentProfile.website || '';
        
        modal.classList.remove('hidden');
    },

    // Close edit modal
    closeEditModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // Save profile changes
    async saveProfile() {
        const formData = {
            full_name: document.getElementById('edit-full-name').value,
            bio: document.getElementById('edit-bio').value,
            location: document.getElementById('edit-location').value,
            website: document.getElementById('edit-website').value
        };
        
        try {
            const response = await window.AuthAPI.request('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                this.currentProfile = await response.json();
                this.renderProfile();
                this.closeEditModal();
                this.showSuccess('Profile updated successfully');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showError('Failed to update profile');
        }
    },

    // Open avatar upload
    openAvatarUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.handleAvatarUpload(e.target.files[0]);
        input.click();
    },

    // Handle avatar upload
    async handleAvatarUpload(file) {
        if (!file) return; 
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await window.AuthAPI.request('/api/users/me/upload-profile-picture', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentProfile.profile_picture = data.profile_picture;
                this.renderProfile();
                this.showSuccess('Profile picture updated');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showError('Failed to upload profile picture');
        }
    },

    // Handle profile image click
    handleProfileImageClick(imageUrl) {
        this.openProfileImageOptions(imageUrl);
    },

    // Open profile image options modal
    openProfileImageOptions(imageUrl) {
        const modal = this.createOptionsModal(imageUrl);
        document.body.appendChild(modal);
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10); // Add active class after a short delay for transition
    },

    // Create options modal
    createOptionsModal(imageUrl) {
        const modal = document.createElement('div');
        modal.id = 'profile-image-options-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center profile-options-overlay';
        modal.innerHTML = `
            <div class="bg-surface rounded-xl max-w-xs w-full m-4 p-6 text-center profile-options-sheet">
                <h3 class="text-lg font-semibold mb-4">Profile Image Options</h3>
                <button onclick="ProfileManager.viewProfilePhoto('${imageUrl}'); ProfileManager.closeOptionsModal()" 
                        class="w-full px-4 py-2 mb-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    View Photo
                </button>
                <button onclick="ProfileManager.openAvatarUpload(); ProfileManager.closeOptionsModal()" 
                        class="w-full px-4 py-2 border border-border-light rounded-lg hover:bg-surface-hover transition-colors">
                    Edit Photo
                </button>
                <button onclick="ProfileManager.closeOptionsModal()" 
                        class="w-full px-4 py-2 mt-4 text-text-secondary hover:text-primary transition-colors">
                    Cancel
                </button>
            </div>
        `;

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeOptionsModal();
            }
        });

        return modal;
    },

    // Close options modal
    closeOptionsModal() {
        const modal = document.getElementById('profile-image-options-modal');
        if (modal) {
            modal.classList.remove('active');
            // Remove from DOM after transition
            modal.addEventListener('transitionend', () => modal.remove(), { once: true });
        }
    },

    // View profile photo in full screen
    viewProfilePhoto(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center cursor-pointer';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `
            <img src="${imageUrl}" class="max-w-full max-h-full object-contain">
        `;
        document.body.appendChild(modal);
    },

    // Show followers modal
    async showFollowers() {
        await this.loadFollowers();
    },

    // Show following modal
    async showFollowing() {
        await this.loadFollowing();
    },

    // Send message
    sendMessage() {
        // Implementation for sending message
        console.log('Send message to', this.currentProfile.username);
    },

    // Attach event listeners
    attachEventListeners() {
        // Edit profile form
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }
        
        // Close modal buttons
        document.querySelectorAll('[data-close-modal]').forEach(button => {
            button.addEventListener('click', () => this.closeEditModal());
        });
        
        // Load more posts on scroll
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                if (this.hasMore && this.activeTab === 'posts') {
                    this.loadUserPosts(true);
                }
            }
        });
    },

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    formatBio(bio) {
        // Convert URLs to links and handle line breaks
        return bio
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary hover:underline">$1</a>');
    },

    showError(message) {
        // Show error notification
        console.error(message);
        // Implement toast/notification system
    },

    showSuccess(message) {
        // Show success notification
        console.log(message);
        // Implement toast/notification system
    },

    showUserNotFound() {
        const container = document.querySelector('.max-w-6xl');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <svg class="w-24 h-24 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                    <h2 class="text-2xl font-bold text-text-primary mb-2">User Not Found</h2>
                    <p class="text-text-secondary mb-6">The user you're looking for doesn't exist or has been removed.</p>
                    <a href="/pages/community_feed_dashboard.html" class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        Back to Feed
                    </a>
                </div>
            `;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});

// Export for global access
window.ProfileManager = ProfileManager;