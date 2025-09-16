document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('userList');
    const totalUsers = document.getElementById('totalUsers');
    const newUsersMonth = document.getElementById('newUsersMonth');
    const totalPosts = document.getElementById('totalPosts');
    const viceAdminCount = document.getElementById('viceAdminCount');
    const searchInput = document.getElementById('user-search-input');

    let allUsers = []; // Cache for all users

    // --- Toast Notification ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg z-50 shadow-lg animate-slide-up`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- API Functions ---
    async function fetchStats() {
        try {
            const response = await AuthAPI.request(`/api/admin/stats?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const stats = await response.json();
            totalUsers.textContent = stats.total_users;
            newUsersMonth.textContent = stats.new_users_month;
            totalPosts.textContent = stats.total_posts;
            viceAdminCount.textContent = stats.vice_admins_count;
        } catch (error) {
            console.error(error.message);
        }
    }

    async function fetchUsers() {
        try {
            const response = await AuthAPI.request(`/api/admin/users?_t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Failed to fetch users');
            allUsers = await response.json();
            renderUsers(allUsers);
        } catch (error) {
            console.error(error.message);
            userList.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Failed to load users.</td></tr>`;
        }
    }

    // --- Render Functions ---
    function renderUsers(users) {
        userList.innerHTML = '';
        if (users.length === 0) {
            userList.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user.id;
            if (user.is_suspended) {
                row.classList.add('bg-gray-200', 'opacity-70');
            }

            // Standardized role determination
            const roleDisplayMap = { 'master': 'Master', 'vice_admin': 'Vice-Admin', 'guide': 'Guide', 'member': 'Member' };
            const role = roleDisplayMap[user.role] || 'Member';

            const status = user.is_suspended ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>' : 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>';

            row.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-700">${user.username}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${user.email}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${role}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${status}</td>
                <td class="py-3 px-4 text-sm">
                    ${user.role !== 'master' ? `
                    <select class="role-select border rounded-lg px-2 py-1 text-sm mr-2">
                        <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                        <option value="guide" ${user.role === 'guide' ? 'selected' : ''}>Guide</option>
                        <option value="vice_admin" ${user.role === 'vice_admin' ? 'selected' : ''}>Vice-Admin</option>
                    </select>
                    <button class="suspend-btn px-2 py-1 rounded-lg text-xs ${user.is_suspended ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}">
                        ${user.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    ` : `<span class="px-2 py-1 text-sm text-gray-500 font-medium">Master</span>`}
                </td>
            `;
            userList.appendChild(row);
        });
    }

    // --- Event Handlers ---
    userList.addEventListener('click', (event) => {
        if (event.target.classList.contains('suspend-btn')) {
            const row = event.target.closest('tr');
            const userId = row.dataset.userId;
            const isSuspended = row.classList.contains('bg-gray-200');
            handleSuspendToggle(userId, isSuspended);
        }
    });

    userList.addEventListener('change', async (event) => {
        if (event.target.classList.contains('role-select')) {
            const row = event.target.closest('tr');
            const userId = row.dataset.userId;
            const newRoleValue = event.target.value;

            const user = allUsers.find(u => u.id == userId);
            if (!user) return;

            // Store original state for potential rollback
            const originalRole = user.role;

            // --- Optimistic UI and Data Update ---
            const roleDisplayMap = { 'member': 'Member', 'guide': 'Guide', 'vice_admin': 'Vice-Admin' };
            row.children[2].textContent = roleDisplayMap[newRoleValue] || 'Member'; // Update role column text
            user.role = newRoleValue;

            try {
                const response = await AuthAPI.request(`/api/admin/users/${userId}/role`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: newRoleValue })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to update role');
                }

                showToast('User role updated successfully!');
                await fetchStats(); // Update stats like vice-admin count

            } catch (error) {
                showToast(error.message, 'error');

                // --- Rollback on failure ---
                const userToRevert = allUsers.find(u => u.id == userId);
                if (userToRevert) {
                    userToRevert.role = originalRole;
                }
                // Re-render the table from the corrected local data to guarantee consistency
                renderUsers(allUsers);
            }
        }
    });

    async function handleSuspendToggle(userId, isSuspended) {
        const action = isSuspended ? 'unsuspend' : 'suspend';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const response = await AuthAPI.request(`/api/admin/users/${userId}/${action}`, { method: 'POST' });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed to ${action} user`);
            }
            showToast(`User ${action}ed successfully!`);
            await fetchUsers(); // Refetch to update status
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.username.toLowerCase().includes(searchTerm) || 
            user.email.toLowerCase().includes(searchTerm)
        );
        renderUsers(filteredUsers);
    });

    // --- Initial Load ---
    function initialize() {
        fetchStats();
        fetchUsers();
    }

    initialize();
});