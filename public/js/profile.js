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
    const initials = encodeURIComponent(`${firstName[0] || '?'}${lastName[0] || '?'}`);

    avatar.src = profileUser.avatarUrl
        ? profileUser.avatarUrl
        : `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect fill="%23e2e8f0" width="120" height="120"/><text x="60" y="70" text-anchor="middle" fill="%23718096" font-size="40" font-family="sans-serif">${initials}</text></svg>`;

    document.getElementById('profileName').textContent = `${firstName} ${lastName}`;

    const roleMap = { admin: 'Админ', manager: 'Менеджер', doctor: 'Врач', client: 'Клиент' };
    document.getElementById('profileRole').textContent = roleMap[profileUser.role] || profileUser.role || '—';

    document.getElementById('profileEmail').innerHTML = `<i class="bi bi-envelope"></i> ${escapeHtml(profileUser.userEmail || '—')}`;
    document.getElementById('profilePhone').innerHTML = `<i class="bi bi-phone"></i> ${escapeHtml(profileUser.userPhone || 'Не указан')}`;

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

    const cooldown = document.getElementById('profileCooldown');
    const wait = profileWaitMs(profileUser);
    if (cooldown) {
        cooldown.textContent = wait
            ? `Следующее изменение профиля: через ${formatWait(wait)}.`
            : (profileUser.role === 'admin'
                ? ''
                : (profileUser.role === 'doctor' || profileUser.role === 'manager'
                    ? 'Профиль и фото можно менять раз в 10 минут.'
                    : 'Профиль и фото можно менять раз в сутки.'));
    }
    if (profileUser.ordersBlocked && cooldown) {
        cooldown.textContent = `${cooldown.textContent} Заказы закрыты после двух незаборов. Придите в клинику, чтобы их открыли.`.trim();
    }

    document.getElementById('ordersCard').classList.remove('d-none');
    loadOrders();
}

function profileWaitMs(user) {
    if (!user || user.role === 'admin' || !user.profileUpdatedAt) return 0;
    const windowMs = (user.role === 'doctor' || user.role === 'manager') ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return Math.max(0, new Date(user.profileUpdatedAt).getTime() + windowMs - Date.now());
}

function formatWait(ms) {
    const minutes = Math.ceil(ms / 60000);
    if (minutes >= 90) return `${Math.ceil(minutes / 60)} ч`;
    return `${minutes} мин`;
}

const ORDER_STATUS = {
    pending: 'ожидает',
    ready: 'собран',
    paid: 'выдан',
    cancelled: 'отменён'
};
const CANCEL_REASON = {
    user: 'отменён вами',
    noshow: 'не забрали',
    staff: 'отменила клиника'
};

async function loadOrders() {
    try {
        const data = await API.get('/shop/orders');
        const list = document.getElementById('ordersList');
        if (!data.success || !data.orders.length) {
            list.innerHTML = '<p class="text-muted small mb-0">Заказов пока нет</p>';
            return;
        }
        list.innerHTML = data.orders.map(order => {
            const status = order.orderStatus === 'cancelled' && order.cancelReason
                ? CANCEL_REASON[order.cancelReason] || ORDER_STATUS.cancelled
                : (ORDER_STATUS[order.orderStatus] || order.orderStatus);
            const items = Array.isArray(order.items) ? order.items : [];
            return `
                <div class="border-bottom py-2" data-order="${escapeHtml(order.orderId)}">
                    <small class="fw-semibold">${escapeHtml(order.orderNumber)}</small>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${new Date(order.pickupDate).toLocaleDateString('ru-RU')} ${escapeHtml(String(order.pickupTime || '').substring(0, 5))}</small>
                        <span class="badge bg-secondary">${escapeHtml(status)}</span>
                    </div>
                    ${order.pickupAddress ? `<small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${escapeHtml(order.pickupAddress)}</small>` : ''}
                    <small class="text-muted">${Number(order.totalAmount).toLocaleString()} ₽</small>
                    ${items.length ? `<small class="text-muted d-block">${items.map(item => `${escapeHtml(item.productName)} × ${item.quantity}`).join(', ')}</small>` : ''}
                    ${order.canEdit || order.canCancel ? `
                        <div class="d-flex gap-2 mt-2">
                            ${order.canEdit ? `<button type="button" class="btn btn-sm btn-outline-primary rounded-pill edit-order" data-id="${escapeHtml(order.orderId)}">Изменить</button>` : ''}
                            ${order.canCancel ? `<button type="button" class="btn btn-sm btn-outline-danger rounded-pill cancel-order" data-id="${escapeHtml(order.orderId)}">Отменить</button>` : ''}
                        </div>
                        <div class="order-editor mt-2" id="editor-${escapeHtml(order.orderId)}" hidden></div>
                    ` : ''}
                </div>`;
        }).join('');

        list.querySelectorAll('.cancel-order').forEach(btn => {
            btn.addEventListener('click', () => cancelOrder(btn.dataset.id));
        });
        list.querySelectorAll('.edit-order').forEach(btn => {
            btn.addEventListener('click', () => openOrderEditor(data.orders.find(order => String(order.orderId) === btn.dataset.id)));
        });
    } catch (e) {}
}

async function cancelOrder(orderId) {
    if (!confirm('Отменить заказ? Товар вернётся на склад, эта отмена не считается незабором.')) return;
    try {
        await API.post(`/shop/orders/${orderId}/cancel`);
        loadOrders();
    } catch (e) {
        alert(e.message || 'Не удалось отменить');
    }
}

function openOrderEditor(order) {
    const box = document.getElementById(`editor-${order.orderId}`);
    if (!box || !order) return;
    if (!box.hidden) {
        box.hidden = true;
        return;
    }
    const items = (Array.isArray(order.items) ? order.items : []).map(item => ({
        productId: String(item.productId),
        productName: item.productName,
        quantity: item.quantity
    }));
    box.hidden = false;
    box.dataset.pickup = String(order.pickupTime || '').substring(0, 5);
    renderOrderEditor(box, order, items);
}

function renderOrderEditor(box, order, items) {
    const branches = [
        'г. Нижний Тагил, Ленинградский пр-т, 20',
        'г. Нижний Тагил, ул. Носова, 1'
    ];
    box.innerHTML = `
        ${items.map((item, index) => `
            <div class="d-flex align-items-center gap-2 mb-1">
                <span class="small flex-grow-1">${escapeHtml(item.productName)}</span>
                <input type="number" min="1" max="100" class="form-control form-control-sm editor-qty" data-index="${index}" value="${item.quantity}" style="width:70px">
                <button type="button" class="btn btn-sm btn-outline-danger editor-remove" data-index="${index}">×</button>
            </div>
        `).join('') || '<p class="small text-muted">Добавьте хотя бы один товар</p>'}
        <div class="input-group input-group-sm my-2">
            <input type="search" class="form-control editor-search" placeholder="Найти товар">
            <button type="button" class="btn btn-outline-primary editor-find">Найти</button>
        </div>
        <div class="editor-results mb-2"></div>
        ${branches.map(address => `
            <label class="form-check small">
                <input class="form-check-input editor-branch" type="radio" name="branch-${order.orderId}" value="${escapeHtml(address)}" ${address === order.pickupAddress ? 'checked' : ''}>
                ${escapeHtml(address.replace('г. Нижний Тагил, ', ''))}
            </label>
        `).join('')}
        <input type="date" class="form-control form-control-sm my-2 editor-date" value="${String(order.pickupDate).slice(0, 10)}">
        <div class="row g-1 editor-times mb-2"></div>
        <textarea class="form-control form-control-sm editor-notes mb-2" rows="2" maxlength="500" placeholder="Примечание">${escapeHtml(order.orderNotes || '')}</textarea>
        <button type="button" class="btn btn-sm btn-primary rounded-pill editor-save">Сохранить заказ</button>
    `;

    const sync = () => renderOrderEditor(box, {
        ...order,
        pickupAddress: box.querySelector('.editor-branch:checked')?.value || order.pickupAddress,
        pickupDate: box.querySelector('.editor-date').value,
        orderNotes: box.querySelector('.editor-notes').value
    }, items);

    box.querySelectorAll('.editor-qty').forEach(input => {
        input.addEventListener('change', () => {
            items[input.dataset.index].quantity = Math.min(100, Math.max(1, parseInt(input.value, 10) || 1));
        });
    });
    box.querySelectorAll('.editor-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            items.splice(Number(btn.dataset.index), 1);
            sync();
        });
    });
    box.querySelector('.editor-find').addEventListener('click', async () => {
        const q = box.querySelector('.editor-search').value.trim();
        const data = await API.get(`/shop/products?search=${encodeURIComponent(q)}&limit=8`);
        const results = box.querySelector('.editor-results');
        results.innerHTML = (data.products || []).map(product => `
            <button type="button" class="btn btn-sm btn-outline-secondary me-1 mb-1 editor-add" data-id="${escapeHtml(product.productId)}" data-name="${escapeHtml(product.productName)}">${escapeHtml(product.productName)}</button>
        `).join('') || '<p class="small text-muted mb-0">Ничего не найдено</p>';
        results.querySelectorAll('.editor-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const existing = items.find(item => item.productId === btn.dataset.id);
                if (existing) existing.quantity += 1;
                else items.push({ productId: btn.dataset.id, productName: btn.dataset.name, quantity: 1 });
                sync();
            });
        });
    });
    box.querySelector('.editor-date').addEventListener('change', () => fillEditorTimes(box));
    box.querySelector('.editor-save').addEventListener('click', () => saveOrderEdit(order.orderId, box, items));
    fillEditorTimes(box);
}

async function fillEditorTimes(box) {
    const date = box.querySelector('.editor-date').value;
    const wrap = box.querySelector('.editor-times');
    if (!date) return;
    const [year, month, day] = date.split('-').map(Number);
    const weekend = [0, 6].includes(new Date(year, month - 1, day).getDay());
    const start = weekend ? 10 : 11;
    const end = weekend ? 16 : 20;
    const slots = [];
    for (let hour = start; hour < end; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        }
    }
    let taken = {};
    try {
        const data = await API.get(`/shop/orders/slots?date=${encodeURIComponent(date)}`);
        taken = data.slots || {};
    } catch (e) {}
    const current = box.dataset.pickup || '';
    wrap.innerHTML = slots.map(time => {
        const busy = (taken[time] || 0) >= 4 && time !== current;
        return `<div class="col-4"><button type="button" class="btn btn-sm w-100 ${time === current ? 'btn-primary' : 'btn-outline-primary'} editor-time" data-time="${time}" ${busy ? 'disabled' : ''}>${time}</button></div>`;
    }).join('');
    wrap.querySelectorAll('.editor-time').forEach(btn => {
        btn.addEventListener('click', () => {
            box.dataset.pickup = btn.dataset.time;
            fillEditorTimes(box);
        });
    });
}

async function saveOrderEdit(orderId, box, items) {
    try {
        await API.put(`/shop/orders/${orderId}`, {
            items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
            pickupAddress: box.querySelector('.editor-branch:checked')?.value,
            pickupDate: box.querySelector('.editor-date').value,
            pickupTime: box.dataset.pickup,
            orderNotes: box.querySelector('.editor-notes').value.trim()
        });
        loadOrders();
    } catch (e) {
        alert(e.message || 'Не удалось сохранить заказ');
    }
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
                    profileUser = { ...profileUser, ...data.user, profileUpdatedAt: data.user.profileUpdatedAt || new Date().toISOString() };
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
            alert(e.message || 'Ошибка загрузки аватара');
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