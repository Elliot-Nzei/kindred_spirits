document.addEventListener('DOMContentLoaded', () => {
    const searchModal = document.getElementById('search-modal');
    const openSearchModalMobile = document.getElementById('open-search-modal-mobile');
    const openSearchModalDesktop = document.getElementById('open-search-modal-desktop');
    const closeSearchModal = searchModal.querySelector('[data-close-modal]');

    const searchInput = searchModal.querySelector('#user-search-input');
    const searchButton = searchModal.querySelector('#user-search-button');
    const searchResultsDiv = searchModal.querySelector('#user-search-results');
    const noResultsMessage = searchModal.querySelector('#no-search-results');

    let searchTimeout;

    const openModal = () => {
        searchModal.classList.remove('hidden');
        searchInput.focus();
    };

    const closeModal = () => {
        searchModal.classList.add('hidden');
        searchInput.value = ''; // Clear search input
        searchResultsDiv.innerHTML = ''; // Clear results
        noResultsMessage.textContent = 'Start typing to find users.';
        noResultsMessage.classList.remove('hidden');
    };

    const performSearch = async (query) => {
        if (query.length < 2) {
            searchResultsDiv.innerHTML = '';
            noResultsMessage.textContent = 'Start typing to find users.';
            noResultsMessage.classList.remove('hidden');
            return;
        }

        noResultsMessage.textContent = 'Searching...';
        noResultsMessage.classList.remove('hidden');
        searchResultsDiv.innerHTML = '';

        try {
            const response = await AuthAPI.request(`/api/search/users?q=${query}`);
            if (!response.ok) {
                throw new Error('Failed to search users');
            }
            const users = await response.json();

            if (users.length === 0) {
                noResultsMessage.textContent = 'No users found.';
                noResultsMessage.classList.remove('hidden');
            } else {
                noResultsMessage.classList.add('hidden');
                users.forEach(user => {
                    const userCard = document.createElement('div');
                    userCard.className = 'flex items-center justify-between p-2 bg-surface rounded-lg border border-border-light';
                    userCard.innerHTML = `
                        <a href="soul_profile.html?username=${user.username}" class="flex items-center space-x-3 flex-grow">
                            <img src="${user.profile_picture || 'https://via.placeholder.com/40'}" alt="${user.username}'s Profile" class="w-10 h-10 rounded-full object-cover" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';" />
                            <div>
                                <p class="text-text-primary font-medium text-sm">${user.full_name || user.username}</p>
                                <p class="text-text-secondary text-xs">@${user.username}</p>
                            </div>
                        </a>
                        <button type="button" class="follow-btn bg-primary text-white px-3 py-1 rounded-full text-xs hover:bg-primary-dark transition-colors" data-username="${user.username}" data-is-following="${user.is_following}">
                            ${user.is_following ? 'Following' : 'Follow'}
                        </button>
                    `;
                    searchResultsDiv.appendChild(userCard);
                });
                addFollowButtonListeners();
            }
        } catch (error) {
            console.error('Error during user search:', error);
            noResultsMessage.textContent = 'Error searching users. Please try again.';
            noResultsMessage.classList.remove('hidden');
        }
    };

    const addFollowButtonListeners = () => {
        document.querySelectorAll('.follow-btn').forEach(button => {
            button.removeEventListener('click', handleFollowToggle); // Prevent duplicate listeners
            button.addEventListener('click', handleFollowToggle);
        });
    };

    const handleFollowToggle = async (event) => {
        const button = event.target;
        const username = button.dataset.username;
        const isFollowing = button.dataset.isFollowing === 'true';

        button.disabled = true;
        button.textContent = isFollowing ? 'Unfollowing...' : 'Following...';

        try {
            let response;
            if (isFollowing) {
                response = await AuthAPI.request(`/api/users/${username}/unfollow`, { method: 'DELETE' });
            } else {
                response = await AuthAPI.request(`/api/users/${username}/follow`, { method: 'POST' });
            }

            if (!response.ok) {
                throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
            }

            button.dataset.isFollowing = (!isFollowing).toString();
            button.textContent = !isFollowing ? 'Following' : 'Follow';
            button.classList.toggle('bg-primary', !isFollowing);
            button.classList.toggle('bg-gray-400', isFollowing); // Optional: change color when unfollowed
            button.classList.toggle('hover:bg-primary-dark', !isFollowing);
            button.classList.toggle('hover:bg-gray-500', isFollowing);

        } catch (error) {
            console.error(`Error toggling follow status for ${username}:`, error);
            button.textContent = isFollowing ? 'Following' : 'Follow'; // Revert text on error
            button.classList.toggle('bg-primary', !isFollowing);
            button.classList.toggle('bg-gray-400', isFollowing);
            button.classList.toggle('hover:bg-primary-dark', !isFollowing);
            button.classList.toggle('hover:bg-gray-500', isFollowing);
        } finally {
            button.disabled = false;
        }
    };

    // Event listeners for opening/closing modal
    if (openSearchModalMobile) {
        openSearchModalMobile.addEventListener('click', openModal);
    }
    if (openSearchModalDesktop) {
        openSearchModalDesktop.addEventListener('click', openModal);
    }
    if (closeSearchModal) {
        closeSearchModal.addEventListener('click', closeModal);
    }

    // Event listeners for search within modal
    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    searchInput.addEventListener('keyup', (event) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(searchInput.value);
        }, 500); // Debounce search input
    });
});