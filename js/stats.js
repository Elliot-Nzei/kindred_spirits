document.addEventListener('DOMContentLoaded', () => {
    if (!window.isAuthenticated()) {
        window.location.href = '../index.html';
        return;
    }

    const API_BASE_URL = 'http://127.0.0.1:8000';

    const modulesCompletedStat = document.getElementById('modules-completed-stat');
    const practiceDaysStat = document.getElementById('practice-days-stat');
    const insightsSharedStat = document.getElementById('insights-shared-stat');

    const loadStats = async () => {
        try {
            const token = window.getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/stats/overview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load statistics');
            }

            const stats = await response.json();
            displayStats(stats);

        } catch (error) {
            console.error('Error loading statistics:', error);
            // Handle error display
        }
    };

    const displayStats = (stats) => {
        // These are just examples, as the stats page has more than just these 3 numbers.
        // I am updating the most prominent stats on the page.
        if(modulesCompletedStat) modulesCompletedStat.textContent = stats.total_posts;
        if(practiceDaysStat) practiceDaysStat.textContent = stats.total_likes;
        if(insightsSharedStat) insightsSharedStat.textContent = stats.total_comments;

        // You can expand this to update all the other stats on the page
        // For example, you could have elements with IDs like 'total-followers', 'total-views', etc.
    };

    loadStats();
});