let profileUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    setupForm();
    setupAvatar();
    setupLogout();
});

async function loadProfile() {
    try {
        const data = await API.get('/auth/me');
        if (data.success) {
            profileUser = data.user;
            showProfile();
        }
    } catch (e) {
        document.getElementById('profileLoading').style.display = 'none';
        document.getElementById('notLoggedIn').style.display = 'block';
    }
}

function showProfile() {
    document.getElementById('profileLoading').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';

    if (!profileUser) {
        profileUser = {};
    }

    // Аватар
    const avatar = document.getElementById('profileAvatar');
    const firstName = profileUser.userFirstName || '?';
    const lastName = profileUser.userLastName || '?';

    avatar.src = profileUser.avatarUrl
        ? profileUser.avatarUrl
        : `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="%23e2e8f0" width="120" height="120"/><text x="60" y="70" text-anchor="middle" fill="%23718096" font-size="40" font-family="sans-serif">${firstName[0]}${lastName[0]}</text></svg>`;

    document.getElementById('profileName').textContent = `${firstName} ${lastName}`;

    const roleMap = { admin: 'Админ', manager: 'Менеджер', doctor: 'Врач', client: 'Клиент' };
    document.getElementById('profileRole').textContent = roleMap[profileUser.role] || profileUser.role || '—';

    document.getElementById('profileEmail').innerHTML = `<i class="bi bi-envelope"></i> ${profileUser.userEmail || '—'}`;
    document.getElementById('profilePhone').innerHTML = `<i class="bi bi-phone"></i> ${profileUser.userPhone || 'Не указан'}`;

    // Форма
    document.getElementById('editFirstName').value = profileUser.userFirstName || '';
    document.getElementById('editLastName').value = profileUser.userLastName || '';
    document.getElementById('editEmail').value = profileUser.userEmail || '';
    document.getElementById('editPhone').value = profileUser.userPhone || '';

    // Если врач
    if (profileUser.role === 'doctor') {
        document.getElementById('doctorFields').style.display = 'block';
        document.getElementById('editSpecialization').value = profileUser.doctorSpecialization || '';
        document.getElementById('editExperience').value = profileUser.doctorExperienceYears || 0;
        document.getElementById('editEducation').value = profileUser.doctorEducation || '';
        document.getElementById('editDescription').value = profileUser.doctorDescription || '';
        document.getElementById('editVk').value = profileUser.vkLink || '';
        document.getElementById('editTg').value = profileUser.telegramLink || '';

        if (profileUser.doctorStatus === 'pending') {
            document.getElementById('doctorStatusCard').style.display = 'block';
        }
    }

    // Если клиент — грузим заказы
    if (profileUser.role === 'client') {
        document.getElementById('ordersCard').classList.remove('d-none');
        loadOrders();
    }
}

async function loadOrders() {
    try {
        const data = await API.get('/shop/orders');
        if (data.success && data.orders.length > 0) {
            document.getElementById('ordersList').innerHTML = data.orders.map(order => `
                <div class="border-bottom py-2">
                    <small class="fw-semibold">${order.orderNumber}</small>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${new Date(order.pickupDate).toLocaleDateString('ru-RU')} ${order.pickupTime?.substring(0,5)}</small>
                        <span class="badge bg-${order.orderStatus === 'pending' ? 'warning' : order.orderStatus === 'ready' ? 'info' : order.orderStatus === 'paid' ? 'success' : 'secondary'}">${order.orderStatus}</span>
                    </div>
                    <small class="text-muted">${Number(order.totalAmount).toLocaleString()} ₽</small>
                </div>
            `).join('');
        }
    } catch (e) {}
}

function setupForm() {
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('saveBtn');
        const alert = document.getElementById('profileAlert');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

        const updateData = {
            userFirstName: document.getElementById('editFirstName').value.trim(),
            userLastName: document.getElementById('editLastName').value.trim(),
            userPhone: document.getElementById('editPhone').value.trim()
        };

        if (profileUser.role === 'doctor') {
            updateData.doctorSpecialization = document.getElementById('editSpecialization').value.trim();
            updateData.doctorExperienceYears = parseInt(document.getElementById('editExperience').value) || 0;
            updateData.doctorEducation = document.getElementById('editEducation').value.trim();
            updateData.doctorDescription = document.getElementById('editDescription').value.trim();
            updateData.vkLink = document.getElementById('editVk').value.trim();
            updateData.telegramLink = document.getElementById('editTg').value.trim();
        }

        try {
            const data = await API.put('/profile', updateData);
            if (data.success) {
                alert.style.display = 'block';
                alert.className = 'alert alert-success py-2 small';
                alert.textContent = 'Профиль обновлён!';

                if (data.user) {
                    profileUser = data.user;
                }
                showProfile();
            }
        } catch (e) {
            alert.style.display = 'block';
            alert.className = 'alert alert-danger py-2 small';
            alert.textContent = e.message || 'Ошибка сохранения';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить изменения';
            setTimeout(() => alert.style.display = 'none', 3000);
        }
    });
}

function setupAvatar() {
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверка размера
        if (file.size > 10 * 1024 * 1024) {
            alert('Файл больше 10MB');
            return;
        }

        // Показываем превью сразу
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('profileAvatar').src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Загружаем на сервер
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const data = await API.upload('/profile/avatar', formData);
            if (data.success) {
                document.getElementById('profileAvatar').src = data.avatarUrl + '?t=' + Date.now();
                profileUser.avatarUrl = data.avatarUrl;
                showToast('Аватар обновлён', 'success');
            } else {
                alert(data.message || 'Ошибка загрузки');
            }
        } catch (e) {
            alert('Ошибка загрузки аватара');
        }
    });
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await API.post('/auth/logout');
        window.location.href = '/';
    });
}