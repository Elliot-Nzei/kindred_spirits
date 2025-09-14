document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000';
    const searchInput = document.getElementById('search-input');
    const mainFeed = document.querySelector('main.lg\:col-span-3.space-y-6');

    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            // Maybe show a message to the user
            return;
        }

        try {
            const token = window.getAuthToken();
            const [usersResponse, postsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/search/users?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/search/posts?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!usersResponse.ok || !postsResponse.ok) {
                throw new Error('Search failed');
            }

            const users = await usersResponse.json();
            const posts = await postsResponse.json();

            displaySearchResults(users, posts);

        } catch (error) {
            console.error('Search error:', error);
            mainFeed.innerHTML = '<p class="text-center text-red-500">Could not perform search.</p>';
        }
    };

    const displaySearchResults = (users, posts) => {
        mainFeed.innerHTML = '<h2 class="text-2xl font-bold mb-4">Search Results</h2>';
        
        // Display users
        if (users.length > 0) {
            const usersSection = document.createElement('div');
            usersSection.innerHTML = '<h3 class="text-xl font-semibold mb-2">Users</h3>';
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'card card-hover p-4 flex items-center space-x-4';
                userElement.innerHTML = `
                    <img src="${user.profile_picture ? API_BASE_URL + user.profile_picture : 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}" alt="${user.username}" class="w-16 h-16 rounded-full object-cover">
                    <div>
                        <a href="/pages/soul_profile.html?user=${user.username}" class="text-lg font-bold hover:underline">${user.full_name || user.username}</a>
                        <p class="text-sm text-gray-600">${user.bio || ''}</p>
                    </div>
                `;
                usersSection.appendChild(userElement);
            });
            mainFeed.appendChild(usersSection);
        }

        // Display posts
        if (posts.length > 0) {
            const postsSection = document.createElement('div');
            postsSection.innerHTML = '<h3 class="text-xl font-semibold mt-6 mb-2">Posts</h3>';
            posts.forEach(post => {
                // Re-use the post element creation from feed.js if possible, or redefine here
                const postElement = createPostElement(post); // Assuming createPostElement is available
                postsSection.appendChild(postElement);
            });
            mainFeed.appendChild(postsSection);
        }

        if (users.length === 0 && posts.length === 0) {
            mainFeed.innerHTML += '<p>No results found.</p>';
        }
    };

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // This function is duplicated from feed.js - in a real app, this would be in a shared utility file
    function createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'card card-hover';
        article.setAttribute('data-post-id', post.id);
        const defaultAvatar = 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

        article.innerHTML = `
            <div class="flex items-start space-x-3 mb-4">
                <img src="${post.owner_profile_picture ? API_BASE_URL + post.owner_profile_picture : defaultAvatar}" alt="${post.owner_username}'s Profile" class="w-10 h-10 rounded-full object-cover" onerror="this.src='${defaultAvatar}'; this.onerror=null;" />
                <div class="flex-1">
                    <div class="flex items-center space-x-2">
                        <h4 class="font-medium text-text-primary">${post.owner_username}</h4>
                        <span class="text-text-secondary text-sm">${timeAgo(post.created_at)}</span>
                    </div>
                    <p class="text-text-secondary text-sm">${post.title}</p>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-text-primary mb-3">${post.content}</p>
                ${post.image_url ? `<img src="${API_BASE_URL}${post.image_url}" alt="Post image" class="w-full h-64 object-cover rounded-lg" loading="lazy" onerror="this.style.display='none'">` : ''}
            </div>

            <!-- Interaction Bar -->
            <div class="flex items-center justify-between pt-3 border-t border-border-light">
                <div class="flex items-center space-x-4">
                    <button type="button" class="reaction-btn flex items-center space-x-2 text-text-secondary hover:text-primary transition-colors ${post.is_liked ? 'text-red-love' : ''}">
                        <span class="reaction-icon">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                            </svg>
                        </span>
                        <span class="text-sm reaction-count">${post.likes_count}</span>
                    </button>
                    <button type="button" class="flex items-center space-x-2 text-text-secondary hover:text-primary transition-colors open-comments-modal-btn">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span class="text-sm comment-count">${post.comments_count}</span>
                    </button>
                </div>
                <button type="button" class="bookmark-btn text-text-secondary hover:text-accent transition-colors" title="Bookmark">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path class="bookmark-icon-outline" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        <path class="bookmark-icon-filled hidden" fill-rule="evenodd" d="M5 4a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 20V4z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        `;
        return article;
    }

    function timeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
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
});