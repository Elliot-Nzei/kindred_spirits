document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('userList');
    const totalUsers = document.getElementById('totalUsers');
    const newUsersMonth = document.getElementById('newUsersMonth');
    const totalPosts = document.getElementById('totalPosts');
    const viceAdminCount = document.getElementById('viceAdminCount');

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

    // Fetch and display users
    async function fetchUsers() {
        try {
            const response = await AuthAPI.request('/api/admin/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const users = await response.json();
            userList.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.dataset.userId = user.id;

                let role = 'Member';
                if (user.is_master) role = 'Master';
                else if (user.is_vice_admin) role = 'Vice-Admin';
                else if (user.is_guide) role = 'Guide';

                row.innerHTML = `
                    <td class="py-2 px-4 border-b">${user.username}</td>
                    <td class="py-2 px-4 border-b">${user.email}</td>
                    <td class="py-2 px-4 border-b">${user.full_name || ''}</td>
                    <td class="py-2 px-4 border-b">${role}</td>
                    <td class="py-2 px-4 border-b">
                        ${!user.is_master ? `
                        <select class="role-select border rounded-lg px-2 py-1">
                            <option value="member" ${role === 'Member' ? 'selected' : ''}>Member</option>
                            <option value="guide" ${role === 'Guide' ? 'selected' : ''}>Guide</option>
                            <option value="vice_admin" ${role === 'Vice-Admin' ? 'selected' : ''}>Vice-Admin</option>
                        </select>
                        ` : '<span class="text-gray-500">N/A</span>'}
                    </td>
                `;
                userList.appendChild(row);
            });
        } catch (error) {
            console.error(error.message);
            userList.innerHTML = '<tr><td colspan="5" class="text-center py-4">Failed to load users.</td></tr>';
        }
    }

    // Handle role change
    userList.addEventListener('change', async (event) => {
        if (event.target.classList.contains('role-select')) {
            const userId = event.target.closest('tr').dataset.userId;
            const newRole = event.target.value;

            try {
                const response = await AuthAPI.request(`/api/admin/users/${userId}/role`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ role: newRole })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to update role');
                }
                
                // Refresh the user list and stats to show the change
                fetchUsers();
                fetchStats();

            } catch (error) {
                console.error(error.message);
                alert('Failed to update role: ' + error.message);
                // Revert the select box on failure
                fetchUsers(); 
            }
        }
    });

    // Initial data fetch
    fetchStats();
    fetchUsers();
});