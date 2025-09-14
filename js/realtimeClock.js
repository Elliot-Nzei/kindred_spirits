function updateRealtimeClocks() {
    document.querySelectorAll('[data-timestamp]').forEach(element => {
        const timestamp = element.dataset.timestamp;
        if (timestamp) {
            element.textContent = window.timeAgo(timestamp);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial update
    updateRealtimeClocks();

    // Update every minute
    setInterval(updateRealtimeClocks, 60 * 1000);
});