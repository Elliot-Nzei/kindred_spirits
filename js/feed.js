// feed.js - Complete Feed Management System for Social Platform



// Feed Manager
const FeedManager = {
    currentPage: 0,
    pageSize: 20,
    isLoading: false,
    hasMore: true,
    posts: [],
    
    // Initialize feed
    async init() {
        if (!window.AuthManager?.isAuthenticated()) {
            window.location.href = '/index.html';
            return;
        }

        await this.loadUserInfo();
        this.attachEventListeners();
        await this.loadFeed();
        this.setupInfiniteScroll();
        this.setupRealTimeUpdates();
    },

    // Load current user info
    async loadUserInfo() {
        const user = window.AuthManager.getCurrentUser();
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement) {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            const roleTitle = user.is_guide ? 'Guide ' : '';
            welcomeElement.textContent = `${greeting}, ${roleTitle}${user.username} ✨`;
        }

        // Update user avatar in new post section
        const userAvatar = document.getElementById('new-comment-user-image');
        if (userAvatar && user.profile_picture) {
            userAvatar.src = `${API_BASE_URL}${user.profile_picture}`;
        } else if (userAvatar) {
            userAvatar.src = '/img/default-avatar.jpg'; // Fallback default image
        }

        // Update user avatar in welcome section
        const welcomeUserImage = document.getElementById('welcome-user-image');
        if (welcomeUserImage && user.profile_picture) {
            welcomeUserImage.src = `${API_BASE_URL}${user.profile_picture}`;
        } else if (welcomeUserImage) {
            welcomeUserImage.src = '/img/default-avatar.jpg'; // Fallback default image
        }
    },

    // Load feed posts
    async loadFeed(append = false) {
        if (this.isLoading || (!this.hasMore && append)) return;

        this.isLoading = true;
        const feedContainer = document.getElementById('main-feed-container');
        
        if (!append) {
            this.showLoadingState(feedContainer);
        }

        try {
            const response = await window.AuthAPI.request(
                `/api/feed?skip=${this.currentPage * this.pageSize}&limit=${this.pageSize}`
            );

            if (!response.ok) throw new Error('Failed to load feed');

            const posts = await response.json();
            
            if (posts.length < this.pageSize) {
                this.hasMore = false;
            }

            if (append) {
                this.posts.push(...posts);
            } else {
                this.posts = posts;
            }

            this.renderPosts(feedContainer, posts, append);
            this.currentPage++;

        } catch (error) {
            console.error('Error loading feed:', error);
            this.showError(feedContainer, 'Failed to load feed. Please try again.');
        } finally {
            this.isLoading = false;
        }
    },

    // Render posts to the feed
    renderPosts(container, posts, append = false) {
        if (!append) {
            container.innerHTML = '';
        }

        if (posts.length === 0 && !append) {
            this.showEmptyState(container);
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    },

    // Create post element
    createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'card card-hover fade-in';
        article.setAttribute('data-post-id', post.id);

        const defaultAvatar = '/img/default-avatar.jpg';
        const profilePicture = post.owner_profile_picture 
            ? `${API_BASE_URL}${post.owner_profile_picture}` 
            : defaultAvatar;

        article.innerHTML = `
            <div class="p-4">
                <div class="flex items-start space-x-3 mb-4">
                    <a href="/pages/soul_profile.html?user=${post.owner_username}" class="flex-shrink-0">
                        <img src="${profilePicture}" 
                             alt="${post.owner_username}'s Profile" 
                             class="w-10 h-10 rounded-full object-cover border-2 border-primary-light hover:border-primary transition-all duration-200"
                             onerror="this.src='${defaultAvatar}'; this.onerror=null;" />
                    </a>
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <a href="/pages/soul_profile.html?user=${post.owner_username}" 
                                   class="font-semibold text-text-primary hover:text-primary transition-colors text-base">
                                    ${post.owner_username}
                                </a>
                                <p class="text-text-secondary text-xs" data-timestamp="${post.created_at}">${this.timeAgo(post.created_at)}</p>
                            </div>
                            ${this.createPostMenu(post)}
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <p class="text-text-primary mb-3 whitespace-pre-wrap text-sm leading-relaxed">${this.formatContent(post.content)}</p>
                    ${post.image_url ? `
                        <div class="rounded-lg overflow-hidden shadow-md border border-border-light cursor-pointer" onclick="FeedManager.openImageModal('${API_BASE_URL}${post.image_url}')">
                            <img src="${API_BASE_URL}${post.image_url}" 
                                 alt="Post image" 
                                 class="w-full h-auto max-h-96 object-cover transition-transform duration-300 hover:scale-105" 
                                 loading="lazy" 
                                 onerror="this.style.display='none'">
                        </div>
                    ` : post.video_url ? `
                        <div class="rounded-lg overflow-hidden shadow-md border border-border-light">
                            <video controls class="w-full h-auto max-h-96 object-cover">
                                <source src="${API_BASE_URL}${post.video_url}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ` : ''}
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-border-light">
                    <div class="flex items-center space-x-4">
                        <button type="button" 
                                class="reaction-btn flex items-center space-x-1 text-text-secondary hover:text-red-500 transition-colors ${post.is_liked ? 'text-red-500' : ''}"
                                onclick="FeedManager.toggleLike(${post.id}, this)">
                            <span class="reaction-icon">
                                <svg class="w-5 h-5" fill="${post.is_bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                                </svg>
                            </span>
                            <span class="text-sm reaction-count">${post.likes_count || 0}</span>
                        </button>
                        
                        <button type="button" 
                                class="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors"
                                onclick="FeedManager.openComments(${post.id})">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                            <span class="text-sm comment-count">${post.comments_count || 0}</span>
                        </button>
                        
                        <button type="button" 
                                class="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors"
                                onclick="FeedManager.sharePost(${post.id})">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-4.26 4.26l1.392-4.26zm0 0l-1.392 4.26M7.316 10.658a3 3 0 10-4.26-4.26l4.26 1.392z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <button type="button" 
                            class="bookmark-btn text-text-secondary hover:text-accent transition-colors" 
                            onclick="FeedManager.toggleBookmark(${post.id}, this)"
                            title="Bookmark">
                        <svg class="w-5 h-5" fill="${post.is_bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return article;
    },

    // Create post menu (for post owner)
    createPostMenu(post) {
        const currentUser = window.AuthManager.getCurrentUser();
        if (post.owner_username !== currentUser.username) {
            return '';
        }

        return `
            <div class="relative">
                <button onclick="FeedManager.togglePostMenu(${post.id}, this)" 
                        class="p-1 hover:bg-surface-hover rounded-full transition-colors">
                    <svg class="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                </button>
                <div id="post-menu-${post.id}" class="hidden absolute right-0 mt-2 w-48 bg-surface border border-border-light rounded-lg shadow-lg z-10">
                    <button onclick="FeedManager.editPost(${post.id})" 
                            class="w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors">
                        Edit Post
                    </button>
                    <button onclick="FeedManager.deletePost(${post.id})" 
                            class="w-full text-left px-4 py-2 hover:bg-surface-hover text-red-500 transition-colors">
                        Delete Post
                    </button>
                </div>
            </div>
        `;
    },

    // Toggle post menu
    togglePostMenu(postId, button) {
        const menu = document.getElementById(`post-menu-${postId}`);
        if (menu) {
            menu.classList.toggle('hidden');
            
            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!button.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            if (!menu.classList.contains('hidden')) {
                setTimeout(() => document.addEventListener('click', closeMenu), 0);
            }
        }
    },

    // Toggle like
    async toggleLike(postId, button) {
        const isLiked = button.classList.contains('text-red-500');
        const countSpan = button.querySelector('.reaction-count');
        
        try {
            const endpoint = isLiked 
                ? `/api/posts/${postId}/unlike` 
                : `/api/posts/${postId}/like`;
            
            const response = await window.AuthAPI.request(endpoint, {
                method: isLiked ? 'DELETE' : 'POST'
            });

            if (!response.ok) throw new Error('Failed to update like');

            const data = await response.json();
            
            // Update UI
            button.classList.toggle('text-red-500');
            const svg = button.querySelector('svg');
            svg.setAttribute('fill', isLiked ? 'none' : 'currentColor');
            countSpan.textContent = data.likes_count;
            
            // Animate heart
            this.animateHeart(button);

        } catch (error) {
            console.error('Error toggling like:', error);
        }
    },

    // Animate heart on like
    animateHeart(button) {
        button.classList.add('scale-125');
        setTimeout(() => button.classList.remove('scale-125'), 200);
    },

    // Open comments modal for a post or a reply thread for a specific comment
    async openComments(postId, parentCommentId = null) {
        const modal = document.getElementById('comments-modal');
        if (!modal) {
            this.createCommentsModal();
        }
        
        const modalElement = document.getElementById('comments-modal');
        modalElement.classList.add('active');
        modalElement.setAttribute('data-post-id', postId);
        modalElement.setAttribute('data-parent-comment-id', parentCommentId || ''); // Store parent comment ID

        const commentsHeading = modalElement.querySelector('.comments-heading');
        if (commentsHeading) {
            commentsHeading.textContent = parentCommentId ? 'Reply Thread' : 'Comments';
        }

        await this.loadComments(postId, true, parentCommentId);

        // Start polling for new comments/replies
        this.commentPollingInterval = setInterval(async () => {
            if (modalElement.classList.contains('active')) { // Only poll if modal is open
                await this.loadComments(postId, false, parentCommentId);
            }
        }, 2000); // Poll every 2 seconds
    },

    // Open reply thread modal
    openReplyThread(postId, parentCommentId) {
        this.openComments(postId, parentCommentId);
    },

    // Create comments modal if not exists
    createCommentsModal() {
        const modal = document.createElement('div');
        modal.id = 'comments-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden';
        modal.innerHTML = `
            <div class="bg-surface rounded-xl max-w-2xl w-full max-h-[80vh] m-4 flex flex-col">
                <div class="p-4 border-b border-border-light flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Comments</h3>
                    <button onclick="FeedManager.closeCommentsModal()" class="p-2 hover:bg-surface-hover rounded-full">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                <div id="modal-comments-list" class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div class="text-center py-4">
                        <div class="spinner"></div>
                    </div>
                </div>
                <div class="p-4 border-t border-border-light">
                    <div class="flex space-x-3">
                        <input type="text" 
                               id="comment-input" 
                               placeholder="Write a comment..." 
                               class="flex-1 px-3 py-2 bg-background border border-border-light rounded-lg focus:outline-none focus:border-primary">
                        <button onclick="FeedManager.postComment()" 
                                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Store comments currently displayed in the modal
    currentModalComments: [],

    // Load comments
    async loadComments(postId, initialLoad = true, parentCommentId = null) {
        const commentsList = document.getElementById('modal-comments-list');
        if (initialLoad) {
            commentsList.innerHTML = `<div class="text-center py-4"><div class="spinner"></div></div>`;
            this.currentModalComments = []; // Clear on initial load
        }
        
        try {
            const endpoint = parentCommentId ? `/api/comments/${parentCommentId}/replies` : `/api/posts/${postId}/comments`;
            const response = await window.AuthAPI.request(endpoint);
            if (!response.ok) throw new Error('Failed to load comments');
            
            const commentsData = await response.json();
            const fetchedComments = Array.isArray(commentsData) ? commentsData : commentsData.items || [];

            if (initialLoad) {
                if (parentCommentId) {
                    // For reply thread, fetch parent comment and then its replies
                    const parentCommentResponse = await window.AuthAPI.request(`/api/comments/${parentCommentId}`);
                    if (!parentCommentResponse.ok) throw new Error('Failed to load parent comment');
                    const parentComment = await parentCommentResponse.json();
                    this.renderReplyThread(parentComment, fetchedComments, commentsList);
                } else {
                    this.renderAllComments(fetchedComments, commentsList);
                }
            } else {
                this.appendNewComments(fetchedComments, commentsList, parentCommentId);
            }
            
        } catch (error) {
            console.error('Error loading comments:', error);
            if (initialLoad) {
                commentsList.innerHTML = '<p class="text-red-500 text-center">Failed to load comments</p>';
            }
        }
    },

    // Render all comments (for initial load)
    renderAllComments(comments, container) {
        container.innerHTML = ''; // Clear existing comments
        this.currentModalComments = []; // Reset current comments

        if (comments.length === 0) {
            container.innerHTML = '<p class="text-center text-text-secondary">No comments yet. Be the first to comment!</p>';
            return;
        }

        const commentMap = {};
        const topLevelComments = [];

        comments.forEach(comment => {
            comment.children = [];
            commentMap[comment.id] = comment;
            if (comment.parent_id) {
                if (commentMap[comment.parent_id]) {
                    commentMap[comment.parent_id].children.push(comment);
                }
            } else {
                topLevelComments.push(comment);
            }
        });

        topLevelComments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            container.appendChild(commentElement);
            this.currentModalComments.push(comment);
        });
    },

    // Render a reply thread (parent comment + its replies)
    renderReplyThread(parentComment, replies, container) {
        container.innerHTML = ''; // Clear existing content
        this.currentModalComments = []; // Reset current comments

        // Render the parent comment
        const parentCommentElement = this.createCommentElement(parentComment);
        container.appendChild(parentCommentElement);
        this.currentModalComments.push(parentComment);

        // Render replies within the parent comment's replies container
        const repliesContainer = parentCommentElement.querySelector(`#replies-container-${parentComment.id}`);
        if (repliesContainer) {
            repliesContainer.classList.remove('hidden'); // Ensure replies are visible
            replies.forEach(reply => {
                const replyElement = this.createCommentElement(reply);
                repliesContainer.appendChild(replyElement);
                this.currentModalComments.push(reply);
            });
        }

        if (replies.length === 0) {
            const noRepliesMessage = document.createElement('p');
            noRepliesMessage.className = 'text-center text-text-secondary text-sm mt-4';
            noRepliesMessage.textContent = 'No replies yet. Be the first to reply!';
            if (repliesContainer) {
                repliesContainer.appendChild(noRepliesMessage);
            } else {
                container.appendChild(noRepliesMessage);
            }
        }
    },

    // Append only new comments
    appendNewComments(fetchedComments, container, parentCommentId = null) {
        const commentMap = {};
        this.currentModalComments.forEach(comment => {
            commentMap[comment.id] = comment;
        });

        fetchedComments.forEach(fetchedComment => {
            if (commentMap[fetchedComment.id]) {
                // Update existing comment
                const existingComment = commentMap[fetchedComment.id];
                if (existingComment.likes_count !== fetchedComment.likes_count) {
                    const commentElement = container.querySelector(`[data-comment-id="${fetchedComment.id}"]`);
                    if (commentElement) {
                        const likeCountSpan = commentElement.querySelector('.like-count');
                        if (likeCountSpan) {
                            likeCountSpan.textContent = fetchedComment.likes_count;
                        }
                        const likeButton = commentElement.querySelector('.like-comment-btn');
                        if (likeButton) {
                            if (fetchedComment.is_liked) {
                                likeButton.classList.add('text-red-500');
                            } else {
                                likeButton.classList.remove('text-red-500');
                            }
                        }
                    }
                    existingComment.likes_count = fetchedComment.likes_count;
                    existingComment.is_liked = fetchedComment.is_liked;
                }
            } else {
                // Append new comment
                const commentElement = this.createCommentElement(fetchedComment);
                if (fetchedComment.parent_id) {
                    const parentElement = container.querySelector(`[data-comment-id="${fetchedComment.parent_id}"]`);
                    if (parentElement) {
                        const repliesContainer = parentElement.querySelector('.replies-container');
                        if (repliesContainer) {
                            repliesContainer.appendChild(commentElement);
                        }
                    }
                } else if (!parentCommentId) { // Only append top-level comments if not in a reply thread
                    container.appendChild(commentElement);
                } else if (parentCommentId && fetchedComment.parent_id === parentCommentId) { // Append replies to the correct container in reply thread
                    const repliesContainer = container.querySelector(`#replies-container-${parentCommentId}`);
                    if (repliesContainer) {
                        repliesContainer.appendChild(commentElement);
                    }
                }
                this.currentModalComments.push(fetchedComment);
            }
        });

        if (this.currentModalComments.length === 0 && fetchedComments.length === 0) {
            container.innerHTML = '<p class="text-center text-text-secondary">No comments yet. Be the first to comment!</p>';
        } else if (container.innerHTML === '<p class="text-center text-text-secondary">No comments yet. Be the first to comment!</p>' && this.currentModalComments.length > 0) {
            container.innerHTML = '';
            this.renderAllComments(this.currentModalComments, container);
        }
    },

    // Create a single comment element
    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item p-3 bg-background rounded-lg';
        commentDiv.setAttribute('data-comment-id', comment.id);

        let repliesHtml = '';
        if (comment.children && comment.children.length > 0) {
            repliesHtml = comment.children.map(reply => this.createCommentElement(reply).outerHTML).join('');
        }

        commentDiv.innerHTML = `
            <div class="flex items-start space-x-3">
                <img src="${comment.owner_profile_picture ? API_BASE_URL + comment.owner_profile_picture : '/img/default-avatar.jpg'}" 
                     class="w-8 h-8 rounded-full object-cover" onerror="this.src='/img/default-avatar.jpg'; this.onerror=null;">
                <div class="flex-1">
                    <div class="flex items-center space-x-2">
                        <span class="font-medium text-sm">${comment.owner_username}</span>
                    </div>
                    <p class="text-sm mt-1">${comment.text}</p>
                    <div class="flex items-center space-x-4 mt-2 text-xs text-text-secondary">
                        <button class="like-comment-btn hover:text-red-500 ${comment.is_liked ? 'text-red-500' : ''}" onclick="FeedManager.toggleCommentLike(${comment.id}, this)">
                            <span class="like-count">${comment.likes_count || 0}</span> Likes
                        </button>
                        <button class="reply-comment-btn hover:text-primary" onclick="FeedManager.showReplyInput(${comment.id})">
                            Reply
                        </button>
                        ${comment.children && comment.children.length > 0 ? `
                            <button class="view-replies-btn hover:text-primary" data-comment-id="${comment.id}" data-reply-count="${comment.children.length}" onclick="FeedManager.toggleReplies(${comment.id}, this)">
                                View ${comment.children.length} Replies
                            </button>
                        ` : ''}
                    </div>
                    <div id="reply-input-${comment.id}" class="hidden mt-2">
                        <textarea class="w-full bg-surface border border-border-light rounded-lg p-2 text-sm" placeholder="Write a reply..."></textarea>
                        <button class="mt-2 px-3 py-1 bg-primary text-white rounded-lg text-xs" onclick="FeedManager.postReply(${comment.id})">Post Reply</button>
                    </div>
                    <div id="replies-container-${comment.id}" class="replies-container mt-4 space-y-3 ml-4 border-l-2 border-border-light pl-4 hidden">
                        ${repliesHtml}
                    </div>
                </div>
            </div>
        `;
        return commentDiv;
    },

    // Toggle like on a comment
    async toggleCommentLike(commentId, button) {
        const isLiked = button.classList.contains('text-red-500');
        const endpoint = isLiked ? `/api/comments/${commentId}/unlike` : `/api/comments/${commentId}/like`;
        
        try {
            const response = await window.AuthAPI.request(endpoint, {
                method: isLiked ? 'DELETE' : 'POST'
            });
            if (!response.ok) throw new Error('Failed to update comment like');

            const data = await response.json();
            const likeCountSpan = button.querySelector('.like-count');
            likeCountSpan.textContent = data.likes_count;
            button.classList.toggle('text-red-500');
        } catch (error) {
            console.error('Error toggling comment like:', error);
        }
    },

    // Show reply input
    showReplyInput(commentId) {
        const replyInputDiv = document.getElementById(`reply-input-${commentId}`);
        if (replyInputDiv) {
            replyInputDiv.classList.toggle('hidden');
        }
    },

    // Toggle replies visibility
    toggleReplies(commentId, button) {
        const repliesContainer = document.getElementById(`replies-container-${commentId}`);
        if (repliesContainer) {
            repliesContainer.classList.toggle('hidden');
            if (repliesContainer.classList.contains('hidden')) {
                button.textContent = `View ${button.dataset.replyCount} Replies`;
            } else {
                button.textContent = 'Hide Replies';
            }
        }
    },

    // Post a reply to a comment
    async postReply(commentId) {
        const replyInputDiv = document.getElementById(`reply-input-${commentId}`);
        const textarea = replyInputDiv.querySelector('textarea');
        const text = textarea.value.trim();

        if (!text) return;

        const modal = document.getElementById('comments-modal');
        const postId = modal.getAttribute('data-post-id');

        try {
            const response = await window.AuthAPI.request(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, parent_id: commentId })
            });

            if (!response.ok) throw new Error('Failed to post reply');

            textarea.value = '';
            replyInputDiv.classList.add('hidden');
            // Reload comments for the specific reply thread if it's open, otherwise reload all comments for the post
            const currentParentCommentId = modal.getAttribute('data-parent-comment-id');
            await this.loadComments(postId, false, currentParentCommentId);
        } catch (error) {
            console.error('Error posting reply:', error);
        }
    },

    // Post comment or reply
    async postComment() {
        const modal = document.getElementById('comments-modal');
        const postId = modal.getAttribute('data-post-id');
        const parentCommentId = modal.getAttribute('data-parent-comment-id'); // Get parent comment ID from modal
        const input = document.getElementById('modal-comment-input-1') || document.getElementById('comment-input');

        if (!input) {
            console.error('Comment input field not found!');
            return;
        }

        const text = input.value.trim();
        if (!text) return;

        try {
            const payload = { text: text };
            if (parentCommentId) {
                payload.parent_id = parentCommentId;
            }

            const response = await window.AuthAPI.request(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to post comment');

            input.value = '';
            await this.loadComments(postId, false, parentCommentId); // Pass parentCommentId to reload correctly

            // Update comment count in feed (only for top-level comments)
            if (!parentCommentId) {
                this.updateCommentCount(postId, 1);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    },

    // Update comment count
    updateCommentCount(postId, delta) {
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (post) {
            const countSpan = post.querySelector('.comment-count');
            if (countSpan) {
                const currentCount = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = currentCount + delta;
            }
        }
    },

    // Close comments modal
    closeCommentsModal() {
        const modal = document.getElementById('comments-modal');
        if (modal) {
            modal.classList.remove('active');
            clearInterval(this.commentPollingInterval); // Clear polling interval
        }
    },

    // Share post
    async sharePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const shareUrl = `${window.location.origin}/pages/post.html?id=${postId}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.content.substring(0, 100),
                    url: shareUrl
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareUrl);
            this.showToast('Link copied to clipboard!');
        }
    },

    // Toggle bookmark
    async toggleBookmark(postId, button) {
        // This would need a backend endpoint for bookmarks
        button.classList.toggle('text-accent');
        const svg = button.querySelector('svg');
        const isFilled = svg.getAttribute('fill') === 'currentColor';
        svg.setAttribute('fill', isFilled ? 'none' : 'currentColor');
        
        this.showToast(isFilled ? 'Removed from bookmarks' : 'Added to bookmarks');
    },

    // Delete post
    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await window.AuthAPI.request(`/api/posts/${postId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete post');

            // Remove from DOM
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.style.opacity = '0';
                setTimeout(() => postElement.remove(), 300);
            }

            this.showToast('Post deleted successfully');

        } catch (error) {
            console.error('Error deleting post:', error);
            this.showToast('Failed to delete post', 'error');
        }
    },

    // Edit post
    async editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        // Create edit modal
        this.createEditModal(post);
    },

    // Create edit modal
    createEditModal(post) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-surface rounded-xl max-w-2xl w-full m-4">
                <div class="p-4 border-b border-border-light">
                    <h3 class="text-lg font-semibold">Edit Post</h3>
                </div>
                <div class="p-4">
                    <input type="text" id="edit-title" value="${post.title}" 
                           class="w-full mb-3 px-3 py-2 bg-background border border-border-light rounded-lg">
                    <textarea id="edit-content" rows="4" 
                              class="w-full px-3 py-2 bg-background border border-border-light rounded-lg">${post.content}</textarea>
                </div>
                <div class="p-4 border-t border-border-light flex justify-end space-x-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-border-light rounded-lg hover:bg-surface-hover">
                        Cancel
                    </button>
                    <button onclick="FeedManager.saveEditedPost(${post.id})" 
                            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Save edited post
    async saveEditedPost(postId) {
        const title = document.getElementById('edit-title').value;
        const content = document.getElementById('edit-content').value;

        try {
            const response = await window.AuthAPI.request(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });

            if (!response.ok) throw new Error('Failed to update post');

            // Close modal
            document.querySelector('.fixed').remove();
            
            // Reload feed to show changes
            this.currentPage = 0;
            await this.loadFeed();
            
            this.showToast('Post created successfully!');

        } catch (error) {
            console.error('Error updating post:', error);
            this.showToast('Failed to update post', 'error');
        }
    },

    // Create new post
    async createPost() {
        const modal = document.getElementById('new-post-modal');
        const contentInput = document.getElementById('new-post-content');
        const imageInput = document.getElementById('new-post-image-upload');
        
        const content = contentInput.value.trim();
        const imageFile = imageInput?.files[0];

        if (!content && !imageFile) {
            this.showToast('Please write something or upload an image', 'warning');
            return;
        }

        const submitBtn = modal.querySelector('#submit-new-post');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            let imageUrl = null;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                
                const uploadResponse = await window.AuthAPI.request('/api/upload/image', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload image');
                }
                const uploadData = await uploadResponse.json();
                imageUrl = uploadData.image_url;
            }

            let payload = {
                content: content,
                image_url: imageUrl
            };

            const response = await window.AuthAPI.request('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to create post');

            const newPost = await response.json(); // Get the newly created post object

            // Clear form and close modal
            contentInput.value = '';
            if (imageInput) imageInput.value = '';
            modal.classList.remove('active');

            // Prepend the new post to the feed
            const feedContainer = document.getElementById('main-feed-container');
            const newPostElement = this.createPostElement(newPost);
            feedContainer.prepend(newPostElement); // Prepend instead of append

            // Add the new post to the beginning of the posts array
            this.posts.unshift(newPost);
            
            this.showToast('Post created successfully!');

        } catch (error) {
            console.error('Error creating post:', error);
            this.showToast('Failed to create post', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    },

    // Format content with links and mentions
    formatContent(content) {
        // Convert URLs to links
        content = content.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" class="text-primary hover:underline">$1</a>'
        );
        
        // Convert @mentions to links
        content = content.replace(
            /@(\w+)/g,
            '<a href="/pages/soul_profile.html?user=$1" class="text-primary hover:underline">@$1</a>'
        );
        
        // Convert #hashtags
        content = content.replace(
            /#(\w+)/g,
            '<span class="text-primary">#$1</span>'
        );
        
        return content;
    },

    // Time ago helper
    timeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

        if (seconds < 120) { // Less than 2 minutes
            return 'Just now';
        }

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now'; // Fallback
    },

    // Setup infinite scroll
    setupInfiniteScroll() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                    this.loadFeed(true);
                }
            }, 100);
        });
    },

    // Setup real-time updates (WebSocket or polling)
    setupRealTimeUpdates() {
        // Poll for new posts every 2 seconds
        setInterval(async () => {
            if (document.hidden) return; // Don't poll if tab is not active
            
            try {
                // Fetch a small number of the latest posts to check for changes
                const response = await window.AuthAPI.request('/api/feed?limit=20'); // Fetch top 20 posts
                if (!response.ok) throw new Error('Failed to fetch latest posts for real-time update');
                
                const latestPosts = await response.json();

                // Update existing posts (likes/comments)
                latestPosts.forEach(latestPost => {
                    const currentPost = this.posts.find(p => p.id === latestPost.id);
                    if (currentPost) {
                        // Update likes
                        if (latestPost.likes_count !== currentPost.likes_count) {
                            const postElement = document.querySelector(`[data-post-id="${latestPost.id}"]`);
                            if (postElement) {
                                const countSpan = postElement.querySelector('.reaction-count');
                                if (countSpan) {
                                    countSpan.textContent = latestPost.likes_count;
                                }
                            }
                            currentPost.likes_count = latestPost.likes_count;
                        }
                        // Update comments
                        if (latestPost.comments_count !== currentPost.comments_count) {
                            const postElement = document.querySelector(`[data-post-id="${latestPost.id}"]`);
                            if (postElement) {
                                const countSpan = postElement.querySelector('.comment-count');
                                if (countSpan) {
                                    countSpan.textContent = latestPost.comments_count;
                                }
                            }
                            currentPost.comments_count = latestPost.comments_count;
                        }
                    }
                });

                // Check for new posts and prepend them
                if (latestPosts.length > 0 && this.posts.length > 0) {
                    const newPosts = latestPosts.filter(latestPost => 
                        !this.posts.some(currentPost => currentPost.id === latestPost.id)
                    );

                    if (newPosts.length > 0) {
                        const feedContainer = document.getElementById('main-feed-container');
                        newPosts.reverse().forEach(newPost => { // Reverse to prepend in correct order
                            const newPostElement = this.createPostElement(newPost);
                            feedContainer.prepend(newPostElement);
                            this.posts.unshift(newPost); // Add to our internal array
                        });
                        this.showNewPostsNotification();
                    }
                }

            } catch (error) {
                console.error('Error checking for new posts:', error);
            }
        }, 2000); // 2 seconds
    },

    // Show new posts notification
    showNewPostsNotification() {
        if (this.newPostsNotificationElement) return; // Notification already shown

        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-lg cursor-pointer z-50';
        notification.textContent = 'New posts available. Click to scroll to top.';
        notification.onclick = () => {
            notification.remove();
            this.newPostsNotificationElement = null;
            window.scrollTo(0, 0); // Just scroll to top, new posts are already prepended
        };
        document.body.appendChild(notification);
        this.newPostsNotificationElement = notification;
        
        // Auto-hide after some time if not clicked
        setTimeout(() => {
            if (this.newPostsNotificationElement) {
                this.newPostsNotificationElement.remove();
                this.newPostsNotificationElement = null;
            }
        }, 10000); // Hide after 10 seconds
    },

    

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500';
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg z-50 animate-slide-up`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Open image modal
    openImageModal(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center cursor-pointer';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `
            <img src="${imageUrl}" class="max-w-full max-h-full object-contain">
        `;
        document.body.appendChild(modal);
    },

    // Attach event listeners
    attachEventListeners() {
        // New post modal
        const newPostBtnDesktop = document.getElementById('open-new-post-modal-desktop');
        const newPostBtnMobile = document.getElementById('open-new-post-modal-mobile');
        const newPostModal = document.getElementById('new-post-modal');
        const closeNewPostBtn = document.getElementById('close-new-post-modal');
        const submitPostBtn = document.getElementById('submit-new-post');
        const newPostImageUpload = document.getElementById('new-post-image-upload');
        const newPostImagePreview = document.getElementById('new-post-image-preview');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const clearImageUploadBtn = document.getElementById('clear-image-upload');
        const newPostUserImage = document.getElementById('new-post-user-image');

        const openNewPostModal = () => {
            newPostModal?.classList.add('active');
            // Set user avatar in new post modal
            const user = window.AuthManager.getCurrentUser();
            if (newPostUserImage && user.profile_picture) {
                newPostUserImage.src = `${API_BASE_URL}${user.profile_picture}`;
            } else if (newPostUserImage) {
                newPostUserImage.src = '/img/default-avatar.jpg'; // Fallback default image
            }
        };

        const closeNewPostModal = () => {
            newPostModal?.classList.remove('active');
            // Clear any previous image preview
            if (newPostImageUpload) newPostImageUpload.value = '';
            if (newPostImagePreview) newPostImagePreview.src = '';
            if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
            // Clear textarea
            const newPostContent = document.getElementById('new-post-content');
            if (newPostContent) newPostContent.value = '';
        };

        if (newPostBtnDesktop) {
            newPostBtnDesktop.addEventListener('click', openNewPostModal);
        }
        if (newPostBtnMobile) {
            newPostBtnMobile.addEventListener('click', openNewPostModal);
        }
        if (closeNewPostBtn) {
            closeNewPostBtn.addEventListener('click', closeNewPostModal);
        }
        if (submitPostBtn) {
            submitPostBtn.addEventListener('click', () => this.createPost());
        }

        // Handle image preview for new post
        if (newPostImageUpload) {
            newPostImageUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (newPostImagePreview) newPostImagePreview.src = e.target.result;
                        if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                } else {
                    if (newPostImagePreview) newPostImagePreview.src = '';
                    if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
                }
            });
        }

        // Handle clear image upload
        if (clearImageUploadBtn) {
            clearImageUploadBtn.addEventListener('click', () => {
                if (newPostImageUpload) newPostImageUpload.value = '';
                if (newPostImagePreview) newPostImagePreview.src = '';
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
            });
        }

        // Close modal on outside click
        if (newPostModal) {
            newPostModal.addEventListener('click', (e) => {
                if (e.target === newPostModal) {
                    closeNewPostModal();
                }
            });
        }

        // Add this for static comment modal post button
        const postCommentBtn1 = document.getElementById('post-modal-comment-btn-1');
        if (postCommentBtn1) {
            postCommentBtn1.addEventListener('click', () => this.postComment());
        }

        // Add close for static comment modal
        const closeCommentsBtn1 = document.getElementById('close-comments-modal-1');
        if (closeCommentsBtn1) {
            closeCommentsBtn1.addEventListener('click', () => this.closeCommentsModal());
        }
    },

    // Show loading state
    showLoadingState(container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p class="mt-2 text-text-secondary">Loading feed...</p>
            </div>
        `;
    },

    // Show empty state
    showEmptyState(container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <h3 class="text-lg font-semibold mb-2">No posts yet</h3>
                <p class="text-text-secondary mb-4">Follow some people or create your first post!</p>
                <button onclick="document.getElementById('new-post-modal')?.classList.add('active')" 
                        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    Create Post
                </button>
            </div>
        `;
    },

    // Show error state
    showError(container, message) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>${message}</p>
                <button onclick="FeedManager.loadFeed()" 
                        class="mt-4 px-4 py-2 border border-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    Try Again
                </button>
            </div>
        `;
    }
};

// Initialize feed when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FeedManager DOMContentLoaded fired!');
    if (window.location.pathname.includes('community_feed_dashboard')) {
        FeedManager.init();
    }
});

// Export for global use
window.FeedManager = FeedManager;