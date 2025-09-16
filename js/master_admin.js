document.addEventListener('DOMContentLoaded', () => {
    const createViceAdminForm = document.getElementById('createViceAdminForm');
    const messageDiv = document.getElementById('message');
    const viceAdminList = document.getElementById('viceAdminList');
    const viceAdminCount = document.getElementById('viceAdminCount');
    const totalUsers = document.getElementById('totalUsers');
    const newUsersMonth = document.getElementById('newUsersMonth');
    const totalPosts = document.getElementById('totalPosts');

    // Fetch and display stats
    async function fetchStats() {
        try {
            const response = await AuthAPI.request('/api/admin/stats');
            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }
            const stats = await response.json();
            totalUsers.textContent = stats.total_users;
            newUsersMonth.textContent = stats.new_users_month;
            totalPosts.textContent = stats.total_posts;
            viceAdminCount.textContent = stats.vice_admins_count;
        } catch (error) {
            console.error(error.message);
        }
    }

    // Fetch and display vice admins
    async function fetchViceAdmins() {
        try {
            const response = await AuthAPI.request('/api/admin/vice-admins');
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to fetch vice admins');
            }
            const admins = await response.json();
            viceAdminList.innerHTML = '';
            admins.forEach(admin => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="py-2 px-4 border-b">${admin.username}</td>
                    <td class="py-2 px-4 border-b">${admin.email}</td>
                    <td class="py-2 px-4 border-b">${admin.full_name}</td>
                    <td class="py-2 px-4 border-b">
                        <button class="text-blue-500 hover:underline">Edit</button>
                        <button class="text-red-500 hover:underline ml-4">Delete</button>
                    </td>
                `;
                viceAdminList.appendChild(row);
            });
        } catch (error) {
            console.error(error.message);
            viceAdminList.innerHTML = '<tr><td colspan="4" class="text-center py-4">Failed to load vice admins.</td></tr>';
        }
    }

    if (createViceAdminForm) {
        createViceAdminForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const fullName = document.getElementById('full_name').value;
            const password = document.getElementById('password').value;

            try {
                const response = await AuthAPI.request('/api/admin/create-vice-admin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        full_name: fullName,
                        password
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to create vice admin');
                }

                const data = await response.json();
                messageDiv.textContent = `Successfully created vice admin: ${data.username}`;
                messageDiv.className = 'text-green-500';
                createViceAdminForm.reset();
                fetchViceAdmins(); // Refresh the list
                fetchStats(); // Refresh the stats
            } catch (error) {
                messageDiv.textContent = error.message;
                messageDiv.className = 'text-red-500';
            }
        });
    }

    // Initial fetch
    fetchStats();
    fetchViceAdmins();
});
