document.addEventListener('DOMContentLoaded', () => {
    console.log('vice_admin.js: DOMContentLoaded fired.');
    
    // DOM Elements
    const elements = {
        stats: {
            pendingReports: document.getElementById('pendingReports'),
            resolvedToday: document.getElementById('resolvedToday'),
            totalPosts: document.getElementById('totalPosts'),
            activeUsers: document.getElementById('activeUsers')
        },
        lists: {
            contentModerationList: document.getElementById('contentModerationList'),
            practiceUploadsList: document.getElementById('practiceUploadsList'),
            workshopsList: document.getElementById('workshopsList'),
            dailyWisdomList: document.getElementById('dailyWisdomList'),
            userSupportList: document.getElementById('userSupportList')
        },
        searchInputs: {
            contentModeration: document.getElementById('content-moderation-search'),
            practiceUploads: document.getElementById('practice-uploads-search'),
            workshops: document.getElementById('workshops-search'),
            userSupport: document.getElementById('user-support-search')
        },
        filters: {
            contentModerationFilter: document.getElementById('content-moderation-filter'),
            practiceUploadsFilter: document.getElementById('practice-uploads-filter'),
            userSupportFilter: document.getElementById('user-support-filter')
        }
    };

    // State management
    let data = {
        contentReports: [],
        practiceUploads: [],
        workshops: [],
        dailyWisdom: [],
        userSupport: []
    };

    let filteredData = {
        contentReports: [],
        practiceUploads: [],
        userSupport: []
    };

    // --- Toast Notification ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500';
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg z-50 shadow-lg transition-opacity duration-300`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- API Functions ---
    async function fetchStats() {
        console.log('vice_admin.js: fetchStats called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/stats?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            
            const stats = await response.json();
            if (elements.stats.pendingReports) elements.stats.pendingReports.textContent = stats.pending_reports || '0';
            if (elements.stats.resolvedToday) elements.stats.resolvedToday.textContent = stats.resolved_today || '0';
            if (elements.stats.totalPosts) elements.stats.totalPosts.textContent = stats.total_posts || '0';
            if (elements.stats.activeUsers) elements.stats.activeUsers.textContent = stats.active_users || '0';
        } catch (error) {
            console.error('vice_admin.js: Error in fetchStats:', error.message);
            showToast('Failed to load statistics', 'error');
        }
    }

    async function fetchContentReports() {
        console.log('vice_admin.js: fetchContentReports called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/content-reports?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch content reports');
            
            data.contentReports = await response.json();
            filteredData.contentReports = data.contentReports;
            renderContentReports(filteredData.contentReports);
        } catch (error) {
            console.error('vice_admin.js: Error in fetchContentReports:', error.message);
            showError(elements.lists.contentModerationList, 'Failed to load content reports');
        }
    }

    async function fetchPracticeUploads() {
        console.log('vice_admin.js: fetchPracticeUploads called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/practice-uploads?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch practice uploads');
            
            data.practiceUploads = await response.json();
            filteredData.practiceUploads = data.practiceUploads;
            renderPracticeUploads(filteredData.practiceUploads);
        } catch (error) {
            console.error('vice_admin.js: Error in fetchPracticeUploads:', error.message);
            showError(elements.lists.practiceUploadsList, 'Failed to load practice uploads');
        }
    }

    async function fetchWorkshops() {
        console.log('vice_admin.js: fetchWorkshops called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/workshops?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch workshops');
            
            data.workshops = await response.json();
            renderWorkshops(data.workshops);
        } catch (error) {
            console.error('vice_admin.js: Error in fetchWorkshops:', error.message);
            showError(elements.lists.workshopsList, 'Failed to load workshops');
        }
    }

    async function fetchDailyWisdom() {
        console.log('vice_admin.js: fetchDailyWisdom called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/daily-wisdom?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch daily wisdom');
            
            data.dailyWisdom = await response.json();
            renderDailyWisdom(data.dailyWisdom);
        } catch (error) {
            console.error('vice_admin.js: Error in fetchDailyWisdom:', error.message);
            showError(elements.lists.dailyWisdomList, 'Failed to load daily wisdom');
        }
    }

    async function fetchUserSupport() {
        console.log('vice_admin.js: fetchUserSupport called.');
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request(`/api/vice-admin/user-support?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch user support tickets');
            
            data.userSupport = await response.json();
            filteredData.userSupport = data.userSupport;
            renderUserSupport(filteredData.userSupport);
        } catch (error) {
            console.error('vice_admin.js: Error in fetchUserSupport:', error.message);
            showError(elements.lists.userSupportList, 'Failed to load support tickets');
        }
    }

    // --- Action Functions ---
    async function moderateContent(reportId, action, reason = '') {
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request('/api/vice-admin/moderate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, action, reason })
            });

            if (!response.ok) throw new Error('Failed to moderate content');
            
            showToast(`Content ${action === 'approve' ? 'approved' : 'removed'} successfully`);
            fetchContentReports();
            fetchStats();
        } catch (error) {
            console.error('Error moderating content:', error);
            showToast('Failed to moderate content', 'error');
        }
    }

    async function approvePracticeUpload(uploadId) {
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request('/api/vice-admin/approve-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uploadId })
            });

            if (!response.ok) throw new Error('Failed to approve upload');
            
            showToast('Practice upload approved successfully');
            fetchPracticeUploads();
        } catch (error) {
            console.error('Error approving upload:', error);
            showToast('Failed to approve upload', 'error');
        }
    }

    async function rejectPracticeUpload(uploadId, reason) {
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const response = await AuthAPI.request('/api/vice-admin/reject-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uploadId, reason })
            });

            if (!response.ok) throw new Error('Failed to reject upload');
            
            showToast('Practice upload rejected');
            fetchPracticeUploads();
        } catch (error) {
            console.error('Error rejecting upload:', error);
            showToast('Failed to reject upload', 'error');
        }
    }

    async function respondToSupport(ticketId, response) {
        try {
            if (typeof AuthAPI === 'undefined') throw new Error('AuthAPI not loaded');
            const apiResponse = await AuthAPI.request('/api/vice-admin/respond-support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, response })
            });

            if (!apiResponse.ok) throw new Error('Failed to respond to support ticket');
            
            showToast('Support response sent successfully');
            fetchUserSupport();
        } catch (error) {
            console.error('Error responding to support:', error);
            showToast('Failed to send response', 'error');
        }
    }

    // --- Utility Functions ---
    function showError(listElement, message) {
        if (listElement) {
            listElement.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">${message}</td></tr>`;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    function getPriorityBadge(priority) {
        const priorityMap = {
            'high': 'bg-red-100 text-red-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        };
        return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityMap[priority] || 'bg-gray-100 text-gray-800'}">${priority || 'Normal'}</span>`;
    }

    function getStatusBadge(status) {
        const statusMap = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'resolved': 'bg-blue-100 text-blue-800',
            'open': 'bg-yellow-100 text-yellow-800',
            'closed': 'bg-gray-100 text-gray-800'
        };
        return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[status] || 'bg-gray-100 text-gray-800'}">${status || 'Unknown'}</span>`;
    }

    // --- Render Functions ---
    function renderContentReports(reports) {
        const listElement = elements.lists.contentModerationList;
        if (!listElement) return;

        if (!reports || reports.length === 0) {
            listElement.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No content reports found.</td></tr>';
            return;
        }

        listElement.innerHTML = reports.map(report => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">${report.content_type || 'Post'}</td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="${report.content || ''}">${report.content || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${report.reported_by || 'Anonymous'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${report.reason || 'No reason provided'}</td>
                <td class="px-6 py-4 text-sm">${getStatusBadge(report.status)}</td>
                <td class="px-6 py-4 text-sm">
                    ${report.status === 'pending' ? `
                    <div class="flex space-x-2">
                        <button class="approve-content-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors" data-id="${report.id}">
                            Approve
                        </button>
                        <button class="reject-content-btn px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors" data-id="${report.id}">
                            Remove
                        </button>
                    </div>
                    ` : '<span class="text-gray-500 text-xs">Resolved</span>'}
                </td>
            </tr>
        `).join('');
    }

    function renderPracticeUploads(uploads) {
        const listElement = elements.lists.practiceUploadsList;
        if (!listElement) return;

        if (!uploads || uploads.length === 0) {
            listElement.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No practice uploads found.</td></tr>';
            return;
        }

        listElement.innerHTML = uploads.map(upload => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">${upload.title || 'Untitled'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${upload.uploaded_by || 'Anonymous'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${upload.type || 'Unknown'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${formatDate(upload.created_at)}</td>
                <td class="px-6 py-4 text-sm">${getStatusBadge(upload.status)}</td>
                <td class="px-6 py-4 text-sm">
                    ${upload.status === 'pending' ? `
                    <div class="flex space-x-2">
                        <button class="approve-upload-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors" data-id="${upload.id}">
                            Approve
                        </button>
                        <button class="reject-upload-btn px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors" data-id="${upload.id}">
                            Reject
                        </button>
                        <button class="view-upload-btn px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-id="${upload.id}">
                            View
                        </button>
                    </div>
                    ` : '<span class="text-gray-500 text-xs">Processed</span>'}
                </td>
            </tr>
        `).join('');
    }

    function renderWorkshops(workshops) {
        const listElement = elements.lists.workshopsList;
        if (!listElement) return;

        if (!workshops || workshops.length === 0) {
            listElement.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No workshops found.</td></tr>';
            return;
        }

        listElement.innerHTML = workshops.map(workshop => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${workshop.title || 'Untitled Workshop'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${workshop.facilitator || 'TBD'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${formatDate(workshop.scheduled_date)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${workshop.participants || 0} / ${workshop.max_participants || '∞'}</td>
                <td class="px-6 py-4 text-sm">
                    <div class="flex space-x-2">
                        <button class="edit-workshop-btn px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-id="${workshop.id}">
                            Edit
                        </button>
                        <button class="view-participants-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors" data-id="${workshop.id}">
                            Participants
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderDailyWisdom(wisdom) {
        const listElement = elements.lists.dailyWisdomList;
        if (!listElement) return;

        if (!wisdom || wisdom.length === 0) {
            listElement.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No daily wisdom entries found.</td></tr>';
            return;
        }

        listElement.innerHTML = wisdom.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-600">${formatDate(item.date)}</td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-md truncate" title="${item.content || ''}">${item.content || 'No content'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${item.author || 'Anonymous'}</td>
                <td class="px-6 py-4 text-sm">
                    <div class="flex space-x-2">
                        <button class="edit-wisdom-btn px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-id="${item.id}">
                            Edit
                        </button>
                        <button class="delete-wisdom-btn px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors" data-id="${item.id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderUserSupport(tickets) {
        const listElement = elements.lists.userSupportList;
        if (!listElement) return;

        if (!tickets || tickets.length === 0) {
            listElement.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No support tickets found.</td></tr>';
            return;
        }

        listElement.innerHTML = tickets.map(ticket => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">${ticket.subject || 'No Subject'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${ticket.user || 'Anonymous'}</td>
                <td class="px-6 py-4 text-sm">${getPriorityBadge(ticket.priority)}</td>
                <td class="px-6 py-4 text-sm">${getStatusBadge(ticket.status)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${formatDate(ticket.created_at)}</td>
                <td class="px-6 py-4 text-sm">
                    ${ticket.status === 'open' ? `
                    <div class="flex space-x-2">
                        <button class="view-ticket-btn px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors" data-id="${ticket.id}">
                            View
                        </button>
                        <button class="respond-ticket-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors" data-id="${ticket.id}">
                            Respond
                        </button>
                    </div>
                    ` : '<span class="text-gray-500 text-xs">Closed</span>'}
                </td>
            </tr>
        `).join('');
    }

    // --- Search and Filter Functions ---
    function filterContentReports(query, status) {
        let filtered = data.contentReports;
        if (query) {
            filtered = filtered.filter(report => 
                (report.content && report.content.toLowerCase().includes(query.toLowerCase())) ||
                (report.reported_by && report.reported_by.toLowerCase().includes(query.toLowerCase())) ||
                (report.reason && report.reason.toLowerCase().includes(query.toLowerCase()))
            );
        }
        if (status && status !== 'all') {
            filtered = filtered.filter(report => report.status === status);
        }
        filteredData.contentReports = filtered;
        renderContentReports(filtered);
    }

    function filterPracticeUploads(query, status) {
        let filtered = data.practiceUploads;
        if (query) {
            filtered = filtered.filter(upload => 
                (upload.title && upload.title.toLowerCase().includes(query.toLowerCase())) ||
                (upload.uploaded_by && upload.uploaded_by.toLowerCase().includes(query.toLowerCase())) ||
                (upload.type && upload.type.toLowerCase().includes(query.toLowerCase()))
            );
        }
        if (status && status !== 'all') {
            filtered = filtered.filter(upload => upload.status === status);
        }
        filteredData.practiceUploads = filtered;
        renderPracticeUploads(filtered);
    }

    function filterUserSupport(query, status) {
        let filtered = data.userSupport;
        if (query) {
            filtered = filtered.filter(ticket => 
                (ticket.subject && ticket.subject.toLowerCase().includes(query.toLowerCase())) ||
                (ticket.user && ticket.user.toLowerCase().includes(query.toLowerCase()))
            );
        }
        if (status && status !== 'all') {
            filtered = filtered.filter(ticket => ticket.status === status);
        }
        filteredData.userSupport = filtered;
        renderUserSupport(filtered);
    }

    // Add workshop search filter
    function filterWorkshops(query) {
        let filtered = data.workshops;
        if (query) {
            filtered = filtered.filter(workshop =>
                (workshop.title && workshop.title.toLowerCase().includes(query.toLowerCase())) ||
                (workshop.facilitator && workshop.facilitator.toLowerCase().includes(query.toLowerCase()))
            );
        }
        renderWorkshops(filtered);
    }

    // --- Event Handlers ---
    function attachEventListeners() {
        // Search functionality
        if (elements.searchInputs.contentModeration) {
            elements.searchInputs.contentModeration.addEventListener('input', (e) => {
                const status = elements.filters.contentModerationFilter?.value || 'all';
                filterContentReports(e.target.value, status);
            });
        }

        if (elements.searchInputs.practiceUploads) {
            elements.searchInputs.practiceUploads.addEventListener('input', (e) => {
                const status = elements.filters.practiceUploadsFilter?.value || 'all';
                filterPracticeUploads(e.target.value, status);
            });
        }

        if (elements.searchInputs.userSupport) {
            elements.searchInputs.userSupport.addEventListener('input', (e) => {
                const status = elements.filters.userSupportFilter?.value || 'all';
                filterUserSupport(e.target.value, status);
            });
        }

        // Filter functionality
        if (elements.filters.contentModerationFilter) {
            elements.filters.contentModerationFilter.addEventListener('change', (e) => {
                const query = elements.searchInputs.contentModeration?.value || '';
                filterContentReports(query, e.target.value);
            });
        }

        if (elements.filters.practiceUploadsFilter) {
            elements.filters.practiceUploadsFilter.addEventListener('change', (e) => {
                const query = elements.searchInputs.practiceUploads?.value || '';
                filterPracticeUploads(query, e.target.value);
            });
        }

        if (elements.filters.userSupportFilter) {
            elements.filters.userSupportFilter.addEventListener('change', (e) => {
                const query = elements.searchInputs.userSupport?.value || '';
                filterUserSupport(query, e.target.value);
            });
        }

        // Workshop search event
        const workshopsSearch = document.getElementById('workshops-search');
        if (workshopsSearch) {
            workshopsSearch.addEventListener('input', (e) => {
                filterWorkshops(e.target.value);
            });
        }

        // Content moderation actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('approve-content-btn')) {
                const reportId = Number(e.target.dataset.id);
                if (confirm('Are you sure you want to approve this content?')) {
                    moderateContent(reportId, 'approve');
                }
            }

            if (e.target.classList.contains('reject-content-btn')) {
                const reportId = Number(e.target.dataset.id);
                const reason = prompt('Please provide a reason for rejection:');
                if (reason !== null) {
                    moderateContent(reportId, 'reject', reason);
                }
            }

            if (e.target.classList.contains('approve-upload-btn')) {
                const uploadId = Number(e.target.dataset.id);
                if (confirm('Are you sure you want to approve this upload?')) {
                    approvePracticeUpload(uploadId);
                }
            }

            if (e.target.classList.contains('reject-upload-btn')) {
                const uploadId = Number(e.target.dataset.id);
                const reason = prompt('Please provide a reason for rejection:');
                if (reason !== null) {
                    rejectPracticeUpload(uploadId, reason);
                }
            }

            if (e.target.classList.contains('respond-ticket-btn')) {
                const ticketId = Number(e.target.dataset.id);
                const response = prompt('Enter your response to this support ticket:');
                if (response !== null && response.trim()) {
                    respondToSupport(ticketId, response.trim());
                }
            }

            // View upload details
            if (e.target.classList.contains('view-upload-btn')) {
                const uploadId = Number(e.target.dataset.id);
                const modal = document.getElementById('uploadModal');
                const body = document.getElementById('uploadModalBody');
                if (modal && body) {
                    const upload = data.practiceUploads.find(u => u.id === uploadId);
                    if (upload) {
                        body.innerHTML = `
                            <div>
                                <h5 class="font-bold mb-2">${upload.title || 'Untitled'}</h5>
                                <p><strong>Uploaded By:</strong> ${upload.uploaded_by || 'Anonymous'}</p>
                                <p><strong>Type:</strong> ${upload.type || 'Unknown'}</p>
                                <p><strong>Date:</strong> ${formatDate(upload.created_at)}</p>
                                <p><strong>Status:</strong> ${upload.status}</p>
                                <p><strong>Description:</strong> ${upload.description || 'N/A'}</p>
                            </div>
                        `;
                    } else {
                        body.innerHTML = '<p class="text-red-500">Upload not found.</p>';
                    }
                }
            }

            // View ticket details
            if (e.target.classList.contains('view-ticket-btn')) {
                const ticketId = Number(e.target.dataset.id);
                const modal = document.getElementById('ticketModal');
                const body = document.getElementById('ticketModalBody');
                if (modal && body) {
                    const ticket = data.userSupport.find(t => t.id === ticketId);
                    if (ticket) {
                        body.innerHTML = `
                            <div>
                                <h5 class="font-bold mb-2">${ticket.subject || 'No Subject'}</h5>
                                <p><strong>User:</strong> ${ticket.user || 'Anonymous'}</p>
                                <p><strong>Priority:</strong> ${ticket.priority}</p>
                                <p><strong>Status:</strong> ${ticket.status}</p>
                                <p><strong>Date:</strong> ${formatDate(ticket.created_at)}</p>
                                <p><strong>Message:</strong> ${ticket.message || 'N/A'}</p>
                            </div>
                        `;
                    } else {
                        body.innerHTML = '<p class="text-red-500">Ticket not found.</p>';
                    }
                }
            }
        });

        // Navigation
        const navLinks = document.querySelectorAll('aside nav a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    
                    // Update active nav item
                    navLinks.forEach(l => {
                        l.classList.remove('bg-blue-50', 'font-medium', 'text-gray-700');
                        l.classList.add('text-gray-600');
                    });
                                        link.classList.remove('text-gray-600');
                                        link.classList.add('bg-blue-50', 'font-medium', 'text-gray-700');
                                    });
                                });
                            }
                        }
                    
                        // --- Initialization ---
                        fetchStats();
                        fetchContentReports();
                        fetchPracticeUploads();
                        fetchWorkshops();
                        fetchDailyWisdom();
                        """                        fetchUserSupport();
                        attachEventListeners();

                        const logoutButton = document.querySelector('[data-logout]');
                        if (logoutButton) {
                            logoutButton.addEventListener('click', async () => {
                                try {
                                    await AuthManager.logout();
                                    window.location.href = '../index.html';
                                } catch (error) {
                                    console.error('Logout error:', error);
                                    showToast('Error during logout', 'error');
                                }
                            });
                        }
                    });
               ""
               