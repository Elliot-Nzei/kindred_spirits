/**
 * Vice Admin Dashboard Modal Management
 * Handles all modal interactions, form submissions, and dynamic content loading
 */

class ViceAdminModals {
    constructor() {
        this.modals = new Map();
        this.currentModal = null;
        this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        this.init();
    }

    init() {
        this.registerModals();
        this.attachEventListeners();
        this.setupKeyboardHandlers();
        console.log('ViceAdminModals: Initialized successfully');
    }

    // Register all modals in the system
    registerModals() {
        const modalSelectors = [
            'contentModal',
            'uploadModal', 
            'ticketModal',
            'responseModal',
            'workshopModal',
            'wisdomModal',
            'sectionModal'
        ];

        modalSelectors.forEach(selector => {
            const element = document.getElementById(selector);
            if (element) {
                this.modals.set(selector, {
                    element: element,
                    isOpen: false,
                    previousFocus: null
                });
            }
        });
    }

    // Open modal with proper accessibility and focus management
    openModal(modalId, options = {}) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return false;
        }

        // Close any currently open modal
        if (this.currentModal) {
            this.closeModal(this.currentModal);
        }

        // Store the currently focused element
        modal.previousFocus = document.activeElement;

        // Show modal
        modal.element.style.display = 'flex';
        modal.element.classList.add('active');
        modal.isOpen = true;
        this.currentModal = modalId;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus management
        this.setInitialFocus(modal.element);

        // Trap focus within modal
        this.trapFocus(modal.element);

        // Add show animation
        requestAnimationFrame(() => {
            modal.element.classList.add('animate-fade-in');
        });

        // Custom initialization if provided
        if (options.onOpen && typeof options.onOpen === 'function') {
            options.onOpen(modal.element);
        }

        return true;
    }

    // Close modal and restore previous state
    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal || !modal.isOpen) return false;

        // Add hide animation
        modal.element.classList.add('animate-fade-out');

        setTimeout(() => {
            // Hide modal
            modal.element.style.display = 'none';
            modal.element.classList.remove('active', 'animate-fade-in', 'animate-fade-out');
            modal.isOpen = false;

            // Restore body scroll
            document.body.style.overflow = '';

            // Restore focus
            if (modal.previousFocus) {
                modal.previousFocus.focus();
                modal.previousFocus = null;
            }

            // Clear current modal
            if (this.currentModal === modalId) {
                this.currentModal = null;
            }
        }, 150);

        return true;
    }

    // Set initial focus in modal
    setInitialFocus(modalElement) {
        const focusableElements = modalElement.querySelectorAll(this.focusableElements);
        if (focusableElements.length > 0) {
            // Focus first input field if available, otherwise first focusable element
            const firstInput = modalElement.querySelector('input:not([type="hidden"]), textarea, select');
            const elementToFocus = firstInput || focusableElements[0];
            elementToFocus.focus();
        }
    }

    // Trap focus within modal
    trapFocus(modalElement) {
        const focusableElements = modalElement.querySelectorAll(this.focusableElements);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        modalElement.addEventListener('keydown', handleTabKey);
    }

    // Setup keyboard event handlers
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal(this.currentModal);
            }
        });
    }

    // Attach all event listeners
    attachEventListeners() {
        this.attachCloseHandlers();
        this.attachContentModerationHandlers();
        this.attachUploadHandlers();
        this.attachSupportHandlers();
        this.attachWorkshopHandlers();
        this.attachWisdomHandlers();
        this.attachSectionModalHandlers();
    }

    // Generic close handlers for all modals
    attachCloseHandlers() {
        document.addEventListener('click', (e) => {
            // Close button clicks
            if (e.target.classList.contains('close-modal')) {
                e.preventDefault();
                if (this.currentModal) {
                    this.closeModal(this.currentModal);
                }
            }

            // Background clicks
            if (e.target.classList.contains('modal') && e.target === e.currentTarget) {
                if (this.currentModal) {
                    this.closeModal(this.currentModal);
                }
            }
        });
    }

    // Content moderation modal handlers
    attachContentModerationHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-content-btn')) {
                const reportId = Number(e.target.dataset.id);
                this.showContentDetails(reportId);
            }
        });
    }

    // Upload modal handlers
    attachUploadHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-upload-btn')) {
                const uploadId = Number(e.target.dataset.id);
                this.showUploadDetails(uploadId);
            }
        });
    }

    // Support ticket modal handlers
    attachSupportHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-ticket-btn')) {
                const ticketId = Number(e.target.dataset.id);
                this.showTicketDetails(ticketId);
            }

            if (e.target.classList.contains('respond-ticket-btn')) {
                const ticketId = Number(e.target.dataset.id);
                this.showResponseModal(ticketId);
            }
        });

        // Response form submission
        const responseForm = document.getElementById('responseForm');
        if (responseForm) {
            responseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleResponseSubmission(e);
            });
        }
    }

    // Workshop modal handlers
    attachWorkshopHandlers() {
        const createBtn = document.getElementById('createWorkshopBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showWorkshopModal();
            });
        }

        const workshopForm = document.getElementById('workshopForm');
        if (workshopForm) {
            workshopForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleWorkshopSubmission(e);
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-workshop-btn')) {
                const workshopId = Number(e.target.dataset.id);
                this.showWorkshopModal(workshopId);
            }
        });
    }

    // Wisdom modal handlers
    attachWisdomHandlers() {
        const addBtn = document.getElementById('addWisdomBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showWisdomModal();
            });
        }

        const wisdomForm = document.getElementById('wisdomForm');
        if (wisdomForm) {
            wisdomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleWisdomSubmission(e);
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-wisdom-btn')) {
                const wisdomId = Number(e.target.dataset.id);
                this.showWisdomModal(wisdomId);
            }
        });
    }

    // Section modal handlers (for the generic section viewing)
    attachSectionModalHandlers() {
        document.querySelectorAll('.open-section-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.dataset.sectionTarget;
                this.showSectionModal(targetId);
            });
        });
    }

    // Show content moderation details
    showContentDetails(reportId) {
        // This would typically fetch data from your data store or API
        // For now, we'll assume the data is available globally
        if (typeof window.viceAdminData !== 'undefined' && window.viceAdminData.contentReports) {
            const report = window.viceAdminData.contentReports.find(r => r.id === reportId);
            if (report) {
                this.populateContentModal(report);
                this.openModal('contentModal');
            }
        }
    }

    // Show upload details
    showUploadDetails(uploadId) {
        if (typeof window.viceAdminData !== 'undefined' && window.viceAdminData.practiceUploads) {
            const upload = window.viceAdminData.practiceUploads.find(u => u.id === uploadId);
            if (upload) {
                this.populateUploadModal(upload);
                this.openModal('uploadModal');
            }
        }
    }

    // Show ticket details
    showTicketDetails(ticketId) {
        if (typeof window.viceAdminData !== 'undefined' && window.viceAdminData.userSupport) {
            const ticket = window.viceAdminData.userSupport.find(t => t.id === ticketId);
            if (ticket) {
                this.populateTicketModal(ticket);
                this.openModal('ticketModal');
            }
        }
    }

    // Show response modal for support tickets
    showResponseModal(ticketId) {
        const modal = this.modals.get('responseModal');
        if (modal) {
            // Store ticket ID for form submission
            modal.element.dataset.ticketId = ticketId;
            
            // Clear previous response
            const textarea = modal.element.querySelector('#responseText');
            if (textarea) {
                textarea.value = '';
            }

            this.openModal('responseModal', {
                onOpen: () => {
                    // Focus the textarea
                    if (textarea) {
                        textarea.focus();
                    }
                }
            });
        }
    }

    // Show workshop creation/edit modal
    showWorkshopModal(workshopId = null) {
        const modal = this.modals.get('workshopModal');
        const form = document.getElementById('workshopForm');
        
        if (modal && form) {
            if (workshopId) {
                // Edit mode - populate form
                modal.element.querySelector('h4').textContent = 'Edit Workshop';
                this.populateWorkshopForm(workshopId);
                modal.element.dataset.workshopId = workshopId;
            } else {
                // Create mode - clear form
                modal.element.querySelector('h4').textContent = 'Create Workshop';
                form.reset();
                delete modal.element.dataset.workshopId;
            }

            this.openModal('workshopModal');
        }
    }

    // Show wisdom creation/edit modal
    showWisdomModal(wisdomId = null) {
        const modal = this.modals.get('wisdomModal');
        const form = document.getElementById('wisdomForm');
        
        if (modal && form) {
            if (wisdomId) {
                // Edit mode - populate form
                modal.element.querySelector('h4').textContent = 'Edit Daily Wisdom';
                this.populateWisdomForm(wisdomId);
                modal.element.dataset.wisdomId = wisdomId;
            } else {
                // Create mode - clear form
                modal.element.querySelector('h4').textContent = 'Add Daily Wisdom';
                form.reset();
                // Set today's date as default
                const dateInput = form.querySelector('#wisdomDate');
                if (dateInput) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                delete modal.element.dataset.wisdomId;
            }

            this.openModal('wisdomModal');
        }
    }

    // Show section modal (legacy support)
    showSectionModal(targetId) {
        const targetSection = document.getElementById(targetId);
        const modal = this.modals.get('sectionModal');
        
        if (targetSection && modal) {
            const titleElement = targetSection.querySelector('h3');
            const modalTitle = modal.element.querySelector('#sectionModalTitle');
            const modalBody = modal.element.querySelector('#sectionModalBody');
            
            if (modalTitle) {
                modalTitle.textContent = titleElement ? titleElement.textContent : 'Section Details';
            }
            
            if (modalBody) {
                // Instead of cloning, create a summary view
                modalBody.innerHTML = this.createSectionSummary(targetSection, targetId);
            }
            
            this.openModal('sectionModal');
        }
    }

    // Create a summary view for sections instead of cloning
    createSectionSummary(section, sectionId) {
        const title = section.querySelector('h3')?.textContent || 'Section';
        const description = section.querySelector('p')?.textContent || '';
        const tables = section.querySelectorAll('table tbody tr');
        const itemCount = tables.length;

        return `
            <div class="space-y-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${title}</h3>
                    <p class="text-gray-600 mt-1">${description}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-blue-800 font-medium">Total Items: ${itemCount}</span>
                        <button onclick="document.getElementById('sectionModal').classList.add('hidden'); document.getElementById('${sectionId}').scrollIntoView({behavior: 'smooth'})" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            View Full Section
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-500">
                    <p>This is a summary view. Click "View Full Section" to see all details and perform actions.</p>
                </div>
            </div>
        `;
    }

    // Populate content modal with report data
    populateContentModal(report) {
        const modal = this.modals.get('contentModal');
        const body = modal?.element.querySelector('#contentModalBody');
        
        if (body) {
            body.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                            <p class="text-gray-900">${report.content_type || 'Post'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div>${this.getStatusBadge(report.status)}</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
                            <p class="text-gray-900">${report.reported_by || 'Anonymous'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                            <p class="text-gray-900">${this.formatDate(report.created_at)}</p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Reported Content</label>
                        <div class="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                            ${report.content || 'No content available'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Reason for Report</label>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            ${report.reason || 'No reason provided'}
                        </div>
                    </div>
                    ${report.status === 'pending' ? `
                        <div class="flex space-x-3 pt-4 border-t">
                            <button class="approve-content-btn flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" 
                                    data-id="${report.id}">
                                Approve Content
                            </button>
                            <button class="reject-content-btn flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" 
                                    data-id="${report.id}">
                                Remove Content
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // Populate upload modal with upload data
    populateUploadModal(upload) {
        const modal = this.modals.get('uploadModal');
        const body = modal?.element.querySelector('#uploadModalBody');
        
        if (body) {
            body.innerHTML = `
                <div class="space-y-4">
                    <div class="border-b pb-4">
                        <h3 class="text-xl font-bold text-gray-900">${upload.title || 'Untitled Upload'}</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Uploaded By</label>
                            <p class="text-gray-900">${upload.uploaded_by || 'Anonymous'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <p class="text-gray-900">${upload.type || 'Unknown'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Upload Date</label>
                            <p class="text-gray-900">${this.formatDate(upload.created_at)}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div>${this.getStatusBadge(upload.status)}</div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <div class="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                            ${upload.description || 'No description provided'}
                        </div>
                    </div>
                    ${upload.file_url ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">File</label>
                            <a href="${upload.file_url}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                View File
                            </a>
                        </div>
                    ` : ''}
                    ${upload.status === 'pending' ? `
                        <div class="flex space-x-3 pt-4 border-t">
                            <button class="approve-upload-btn flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" 
                                    data-id="${upload.id}">
                                Approve Upload
                            </button>
                            <button class="reject-upload-btn flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" 
                                    data-id="${upload.id}">
                                Reject Upload
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // Populate ticket modal with support data
    populateTicketModal(ticket) {
        const modal = this.modals.get('ticketModal');
        const body = modal?.element.querySelector('#ticketModalBody');
        
        if (body) {
            body.innerHTML = `
                <div class="space-y-4">
                    <div class="border-b pb-4">
                        <h3 class="text-xl font-bold text-gray-900">${ticket.subject || 'No Subject'}</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
                            <p class="text-gray-900">${ticket.user || 'Anonymous'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <div>${this.getPriorityBadge(ticket.priority)}</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div>${this.getStatusBadge(ticket.status)}</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Created</label>
                            <p class="text-gray-900">${this.formatDate(ticket.created_at)}</p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <div class="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                            ${ticket.message || 'No message provided'}
                        </div>
                    </div>
                    ${ticket.responses && ticket.responses.length > 0 ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Response History</label>
                            <div class="space-y-2 max-h-40 overflow-y-auto">
                                ${ticket.responses.map(response => `
                                    <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                        <div class="flex justify-between items-start mb-1">
                                            <span class="font-medium text-blue-800">${response.responder || 'Support Team'}</span>
                                            <span class="text-xs text-blue-600">${this.formatDate(response.created_at)}</span>
                                        </div>
                                        <p class="text-blue-900 text-sm">${response.message}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${ticket.status === 'open' ? `
                        <div class="flex space-x-3 pt-4 border-t">
                            <button class="respond-ticket-btn flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" 
                                    data-id="${ticket.id}">
                                Send Response
                            </button>
                            <button class="close-ticket-btn px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors" 
                                    data-id="${ticket.id}">
                                Close Ticket
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // Handle form submissions
    handleResponseSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        const response = formData.get('response');
        const modal = this.modals.get('responseModal');
        const ticketId = modal?.element.dataset.ticketId;

        if (ticketId && response?.trim()) {
            // Dispatch custom event for main app to handle
            document.dispatchEvent(new CustomEvent('supportResponse', {
                detail: { ticketId: Number(ticketId), response: response.trim() }
            }));

            // Clear form and close modal
            form.reset();
            this.closeModal('responseModal');
        }
    }

    handleWorkshopSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        const modal = this.modals.get('workshopModal');
        const workshopId = modal?.element.dataset.workshopId;

        const workshopData = {
            title: formData.get('title'),
            description: formData.get('description'),
            date: formData.get('date'),
            time: formData.get('time'),
            facilitator: formData.get('facilitator'),
            capacity: parseInt(formData.get('capacity')) || null
        };

        // Dispatch custom event
        const eventType = workshopId ? 'workshopUpdate' : 'workshopCreate';
        document.dispatchEvent(new CustomEvent(eventType, {
            detail: { workshopId: workshopId ? Number(workshopId) : null, data: workshopData }
        }));

        // Clear form and close modal
        form.reset();
        this.closeModal('workshopModal');
    }

    handleWisdomSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        const modal = this.modals.get('wisdomModal');
        const wisdomId = modal?.element.dataset.wisdomId;

        const wisdomData = {
            content: formData.get('content'),
            author: formData.get('author'),
            date: formData.get('date') || new Date().toISOString().split('T')[0]
        };

        // Dispatch custom event
        const eventType = wisdomId ? 'wisdomUpdate' : 'wisdomCreate';
        document.dispatchEvent(new CustomEvent(eventType, {
            detail: { wisdomId: wisdomId ? Number(wisdomId) : null, data: wisdomData }
        }));

        // Clear form and close modal
        form.reset();
        this.closeModal('wisdomModal');
    }

    // Helper methods for data population
    populateWorkshopForm(workshopId) {
        if (typeof window.viceAdminData !== 'undefined' && window.viceAdminData.workshops) {
            const workshop = window.viceAdminData.workshops.find(w => w.id === workshopId);
            if (workshop) {
                const form = document.getElementById('workshopForm');
                if (form) {
                    form.querySelector('#workshopTitle').value = workshop.title || '';
                    form.querySelector('#workshopDescription').value = workshop.description || '';
                    form.querySelector('#workshopFacilitator').value = workshop.facilitator || '';
                    form.querySelector('#workshopCapacity').value = workshop.max_participants || '';
                    
                    // Handle date/time
                    if (workshop.scheduled_date) {
                        const date = new Date(workshop.scheduled_date);
                        form.querySelector('#workshopDate').value = date.toISOString().split('T')[0];
                        form.querySelector('#workshopTime').value = date.toTimeString().substring(0, 5);
                    }
                }
            }
        }
    }

    populateWisdomForm(wisdomId) {
        if (typeof window.viceAdminData !== 'undefined' && window.viceAdminData.dailyWisdom) {
            const wisdom = window.viceAdminData.dailyWisdom.find(w => w.id === wisdomId);
            if (wisdom) {
                const form = document.getElementById('wisdomForm');
                if (form) {
                    form.querySelector('#wisdomContent').value = wisdom.content || '';
                    form.querySelector('#wisdomAuthor').value = wisdom.author || '';
                    
                    if (wisdom.date) {
                        const date = new Date(wisdom.date);
                        form.querySelector('#wisdomDate').value = date.toISOString().split('T')[0];
                    }
                }
            }
        }
    }

    // Utility methods
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    getPriorityBadge(priority) {
        const priorityMap = {
            'high': 'bg-red-100 text-red-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        };
        return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityMap[priority] || 'bg-gray-100 text-gray-800'}">${priority || 'Normal'}</span>`;
    }

    getStatusBadge(status) {
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

    // Public API methods
    isModalOpen(modalId) {
        const modal = this.modals.get(modalId);
        return modal ? modal.isOpen : false;
    }

    getCurrentModal() {
        return this.currentModal;
    }

    refreshModalData(modalId, data) {
        // Refresh modal content with new data
        switch (modalId) {
            case 'contentModal':
                if (data && this.isModalOpen('contentModal')) {
                    this.populateContentModal(data);
                }
                break;
            case 'uploadModal':
                if (data && this.isModalOpen('uploadModal')) {
                    this.populateUploadModal(data);
                }
                break;
            case 'ticketModal':
                if (data && this.isModalOpen('ticketModal')) {
                    this.populateTicketModal(data);
                }
                break;
        }
    }

    // Error handling for missing elements
    handleMissingElement(elementName) {
        console.warn(`ViceAdminModals: Missing element ${elementName}. Some functionality may not work.`);
        return false;
    }

    // Cleanup method
    destroy() {
        // Remove event listeners and clean up
        document.removeEventListener('keydown', this.escapeHandler);
        this.modals.clear();
        this.currentModal = null;
        console.log('ViceAdminModals: Destroyed successfully');
    }
}

// Initialize the modal system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure we don't initialize twice
    if (!window.viceAdminModals) {
        window.viceAdminModals = new ViceAdminModals();
        
        // Listen for custom events from main application
        document.addEventListener('supportResponse', (e) => {
            console.log('Modal system received support response event:', e.detail);
        });

        document.addEventListener('workshopCreate', (e) => {
            console.log('Modal system received workshop create event:', e.detail);
        });

        document.addEventListener('workshopUpdate', (e) => {
            console.log('Modal system received workshop update event:', e.detail);
        });

        document.addEventListener('wisdomCreate', (e) => {
            console.log('Modal system received wisdom create event:', e.detail);
        });

        document.addEventListener('wisdomUpdate', (e) => {
            console.log('Modal system received wisdom update event:', e.detail);
        });

        // Expose useful methods globally for integration
        window.openModal = (modalId, options) => window.viceAdminModals.openModal(modalId, options);
        window.closeModal = (modalId) => window.viceAdminModals.closeModal(modalId);
        
        console.log('ViceAdminModals: Global initialization complete');
    }
});

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
    if (window.viceAdminModals) {
        window.viceAdminModals.destroy();
    }
});