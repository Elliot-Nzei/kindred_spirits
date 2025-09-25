// Enhanced Real-Time Clock with Accurate Second-by-Second Updates
function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    // Handle future dates
    if (diffInSeconds < 0) {
        return 'in the future';
    }
    
    // Just now (0-4 seconds)
    if (diffInSeconds < 5) {
        return 'just now';
    }
    
    // Seconds (5-59 seconds)
    if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
    }
    
    // Minutes (1-59 minutes)
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    }
    
    // Hours (1-23 hours)
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }
    
    // Days (1-6 days)
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
    
    // Weeks (1-4 weeks)
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
    }
    
    // Months (1-11 months)
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
    }
    
    // Years
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

// Advanced format with more granular detail (optional)
function formatTimeAgoDetailed(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    if (diffInSeconds < 0) {
        return 'in the future';
    }
    
    if (diffInSeconds < 5) {
        return 'just now';
    }
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const remainingSeconds = diffInSeconds % 60;
    
    if (diffInMinutes < 60) {
        // Show minutes and seconds for recent messages
        if (diffInMinutes < 5 && remainingSeconds > 0) {
            return `${diffInMinutes}m ${remainingSeconds}s ago`;
        }
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    const remainingMinutes = diffInMinutes % 60;
    
    if (diffInHours < 24) {
        // Show hours and minutes for recent hours
        if (diffInHours < 3 && remainingMinutes > 0) {
            return `${diffInHours}h ${remainingMinutes}m ago`;
        }
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
}

// Main update function
function updateRealtimeClocks() {
    document.querySelectorAll('[data-timestamp]').forEach(element => {
        const timestamp = element.dataset.timestamp;
        if (!timestamp) return;
        
        // Parse the timestamp (supports various formats)
        let date;
        if (timestamp.match(/^\d+$/)) {
            // Unix timestamp (seconds or milliseconds)
            date = new Date(parseInt(timestamp) * (timestamp.length <= 10 ? 1000 : 1));
        } else {
            // ISO string or other parseable format
            date = new Date(timestamp);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            element.textContent = 'Invalid date';
            return;
        }
        
        // Use detailed format for very recent messages, simple format for older
        const secondsAgo = Math.floor((new Date() - date) / 1000);
        const useDetailed = element.dataset.detailed === 'true' || secondsAgo < 300; // 5 minutes
        
        element.textContent = useDetailed 
            ? formatTimeAgoDetailed(date) 
            : formatTimeAgo(date);
        
        // Add title attribute with exact timestamp for hover
        if (!element.title) {
            element.title = date.toLocaleString();
        }
    });
}

// Performance-optimized update scheduler
class UpdateScheduler {
    constructor() {
        this.intervals = new Map();
        this.elements = new Set();
    }
    
    register(element) {
        this.elements.add(element);
        this.scheduleUpdate(element);
    }
    
    unregister(element) {
        this.elements.delete(element);
        if (this.intervals.has(element)) {
            clearInterval(this.intervals.get(element));
            this.intervals.delete(element);
        }
    }
    
    scheduleUpdate(element) {
        const timestamp = element.dataset.timestamp;
        if (!timestamp) return;
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        // Clear existing interval if any
        if (this.intervals.has(element)) {
            clearInterval(this.intervals.get(element));
        }
        
        let intervalMs;
        
        if (diffInSeconds < 60) {
            // Update every second for first minute
            intervalMs = 1000;
        } else if (diffInSeconds < 3600) {
            // Update every 10 seconds for first hour
            intervalMs = 10000;
        } else if (diffInSeconds < 86400) {
            // Update every minute for first day
            intervalMs = 60000;
        } else {
            // Update every 5 minutes for older items
            intervalMs = 300000;
        }
        
        const intervalId = setInterval(() => {
            this.updateElement(element);
            // Reschedule if interval should change
            const newDiff = Math.floor((new Date() - date) / 1000);
            if ((newDiff >= 60 && diffInSeconds < 60) ||
                (newDiff >= 3600 && diffInSeconds < 3600) ||
                (newDiff >= 86400 && diffInSeconds < 86400)) {
                this.scheduleUpdate(element);
            }
        }, intervalMs);
        
        this.intervals.set(element, intervalId);
    }
    
    updateElement(element) {
        const timestamp = element.dataset.timestamp;
        if (!timestamp) return;
        
        const date = new Date(timestamp);
        const secondsAgo = Math.floor((new Date() - date) / 1000);
        const useDetailed = element.dataset.detailed === 'true' || secondsAgo < 300;
        
        element.textContent = useDetailed 
            ? formatTimeAgoDetailed(date) 
            : formatTimeAgo(date);
    }
    
    updateAll() {
        this.elements.forEach(element => this.updateElement(element));
    }
}

// Global scheduler instance
const scheduler = new UpdateScheduler();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Find all timestamp elements
    const elements = document.querySelectorAll('[data-timestamp]');
    
    // Register each element with the scheduler
    elements.forEach(element => {
        scheduler.register(element);
        scheduler.updateElement(element); // Initial update
    });
    
    // Update every second for the first minute, then adjust
    // This ensures "just now" and seconds are always accurate
    let quickUpdateInterval = setInterval(() => {
        updateRealtimeClocks();
    }, 1000);
    
    // After 1 minute, switch to smart updating
    setTimeout(() => {
        clearInterval(quickUpdateInterval);
        // Continue with performance-optimized scheduling
    }, 60000);
    
    // Watch for new elements being added to DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    // Check if it's a timestamp element
                    if (node.dataset && node.dataset.timestamp) {
                        scheduler.register(node);
                        scheduler.updateElement(node);
                    }
                    // Check for timestamp elements within added node
                    const timestamps = node.querySelectorAll?.('[data-timestamp]');
                    timestamps?.forEach(element => {
                        scheduler.register(element);
                        scheduler.updateElement(element);
                    });
                }
            });
            
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.dataset && node.dataset.timestamp) {
                        scheduler.unregister(node);
                    }
                    const timestamps = node.querySelectorAll?.('[data-timestamp]');
                    timestamps?.forEach(element => {
                        scheduler.unregister(element);
                    });
                }
            });
        });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTimeAgo,
        formatTimeAgoDetailed,
        updateRealtimeClocks,
        UpdateScheduler
    };
}

// Make available globally if needed
if (typeof window !== 'undefined') {
    window.RealtimeClock = {
        formatTimeAgo,
        formatTimeAgoDetailed,
        updateRealtimeClocks,
        UpdateScheduler,
        scheduler
    };
}

// Integration with existing FeedManager if it exists
if (typeof window !== 'undefined' && window.FeedManager) {
    // Override the timeAgo method with our more accurate version
    window.FeedManager.timeAgo = formatTimeAgo;
    window.FeedManager.timeAgoDetailed = formatTimeAgoDetailed;
}