document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAdminAuth();
    if (!user) return;

    loadDashboard();
    setupSidebar();
    setupLogout();
});

async function checkAdminAuth() {
    try {
        const data = await API.get('/auth/me');
        if (data.success && (data.user.role === 'admin' || data.user.role === 'manager')) {
            return data.user;
        }
    } catch (e) {}
    alert('Доступ запрещён. Войдите как администратор.');
    window.location.href = '/login.html';
    return null;
}

function setupLogout() {
    document.getElementById('adminLogout').addEventListener('click', async (e) => {
        e.preventDefault();
        await API.post('/auth/logout');
        window.location.href = '/login.html';
    });
}

function setupSidebar() {
    document.querySelectorAll('#adminSidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#adminSidebar .nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadSection(link.dataset.section);
        });
    });
}

async function loadDashboard() {
    try {
        const data = await API.get('/admin/stats');
        if (data.success) {
            document.getElementById('statUsers').textContent = data.stats.users;
            document.getElementById('statPendingDoctors').textContent = data.stats.pendingDoctors;
            document.getElementById('statOrders').textContent = data.stats.orders;
            document.getElementById('statPosts').textContent = data.stats.posts;
        }

        // Подгружаем последних юзеров в раздел
        const content = document.getElementById('sectionContent');
        if (content && !content.innerHTML.trim()) {
            content.innerHTML = '<p class="text-muted">Загрузка...</p>';
            const usersData = await API.get('/admin/users');
            if (usersData.success) {
                content.innerHTML = `
                    <h5>Пользователи (${usersData.total || usersData.users?.length || 0})</h5>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th></tr></thead>
                            <tbody>${(usersData.users || []).map(u => `
                                <tr>
                                    <td>${escapeHtml(u.userId)}</td>
                                    <td>${escapeHtml(u.userFirstName)} ${escapeHtml(u.userLastName)}</td>
                                    <td>${escapeHtml(u.userEmail)}</td>
                                    <td><span class="badge bg-primary">${escapeHtml(u.role)}</span></td>
                                    <td>${u.isActive ? '<span class="badge bg-success">Активен</span>' : '<span class="badge bg-danger">Заблокирован</span>'}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`;
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки дашборда:', e);
    }
}

function loadSection(section) {
    const content = document.getElementById('sectionContent');
    switch (section) {
        case 'dashboard': content.innerHTML = ''; loadDashboard(); break;
        case 'orders': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadOrders(); break;
        case 'products': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadProducts(); break;
        case 'gallery': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadGallery(); break;
        case 'certificates': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadCertificates(); break;
        case 'categories': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadCategoriesAdmin(); break;
        case 'users': content.innerHTML = '<h5>Управление пользователями</h5><p class="text-muted">Загрузка...</p>'; loadUsers(); break;
        case 'doctors': content.innerHTML = '<h5>Одобрение врачей</h5><p class="text-muted">Загрузка...</p>'; loadPendingDoctors(); break;
        case 'posts': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadPosts(); break;
        case 'services': content.innerHTML = '<p class="text-muted">Загрузка...</p>'; loadServices(); break;
        default: content.innerHTML = `<h5>${section}</h5><p class="text-muted">Раздел в разработке</p>`;
    }
}

// ==================== ЗАКАЗЫ ====================
let allOrders = [];

async function loadOrders() {
    try {
        const data = await API.get('/shop/orders/all');
        if (data.success) {
            allOrders = data.orders;
            renderOrders(allOrders);
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function renderOrders(orders) {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5>Заказы (${orders.length})</h5>
            <div class="d-flex gap-2">
                <input type="text" class="form-control rounded-pill" id="orderSearch" 
                       placeholder="Поиск по номеру..." style="width:250px">
                <select class="form-select rounded-pill" id="orderStatusFilter" style="width:auto">
                    <option value="">Все статусы</option>
                    <option value="pending">Ожидает</option>
                    <option value="ready">Готов</option>
                    <option value="paid">Оплачен</option>
                    <option value="cancelled">Отменён</option>
                </select>
            </div>
        </div>
        ${orders.length === 0 ? '<p class="text-muted">Заказов пока нет</p>' : `
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead><tr>
                    <th>Номер</th>
                    <th>Клиент</th>
                    <th>Телефон</th>
                    <th>Дата выдачи</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr></thead>
                <tbody>${orders.map(o => `
                    <tr>
                        <td><strong>${escapeHtml(o.orderNumber)}</strong></td>
                        <td>${escapeHtml(o.customerName)}</td>
                        <td>${escapeHtml(o.customerPhone)}</td>
                        <td>${new Date(o.pickupDate).toLocaleDateString('ru-RU')} ${escapeHtml(o.pickupTime?.substring(0,5) || '')}</td>
                        <td class="fw-bold">${Number(o.totalAmount).toLocaleString()} ₽</td>
                        <td>
                            <select class="form-select form-select-sm order-status-select" data-id="${o.orderId}" style="width:auto">
                                <option value="pending" ${o.orderStatus === 'pending' ? 'selected' : ''}>Ожидает</option>
                                <option value="ready" ${o.orderStatus === 'ready' ? 'selected' : ''}>Готов</option>
                                <option value="paid" ${o.orderStatus === 'paid' ? 'selected' : ''}>Оплачен</option>
                                <option value="cancelled" ${o.orderStatus === 'cancelled' ? 'selected' : ''}>Отменён</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary rounded-pill view-order" data-id="${o.orderId}" title="Просмотр">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger rounded-pill delete-order" data-id="${o.orderId}" title="Удалить">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`}`;

    document.getElementById('orderSearch')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allOrders.filter(o => o.orderNumber.toLowerCase().includes(q));
        renderOrders(filtered);
    });

    document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => {
        const status = e.target.value;
        const filtered = status ? allOrders.filter(o => o.orderStatus === status) : allOrders;
        renderOrders(filtered);
    });

    document.querySelectorAll('.order-status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            try {
                await API.put(`/shop/orders/${sel.dataset.id}/status`, { orderStatus: sel.value });
                loadOrders();
            } catch (e) {
                alert(e.message || 'Ошибка обновления статуса');
                loadOrders();
            }
        });
    });

    document.querySelectorAll('.view-order').forEach(btn => {
        btn.addEventListener('click', () => showOrderDetails(btn.dataset.id));
    });

    document.querySelectorAll('.delete-order').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить заказ навсегда?')) {
                try {
                    await API.delete('/shop/orders/' + btn.dataset.id);
                    loadOrders();
                } catch (e) {
                    alert(e.message || 'Ошибка удаления');
                }
            }
        });
    });
}

function showOrderDetails(orderId) {
    const order = allOrders.find(o => o.orderId == orderId);
    if (!order) return;

    const items = order.items || [];
    const statusMap = {
        pending: { text: 'Ожидает', color: 'warning' },
        ready: { text: 'Готов', color: 'info' },
        paid: { text: 'Оплачен', color: 'success' },
        cancelled: { text: 'Отменён', color: 'secondary' }
    };
    const st = statusMap[order.orderStatus] || { text: order.orderStatus, color: 'secondary' };

    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Заказ ${escapeHtml(order.orderNumber)}</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToOrders">← Назад</button>
        </div>

        <div class="row g-3">
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3"><i class="bi bi-person text-primary"></i> Клиент</h6>
                        <p class="mb-1"><strong>${escapeHtml(order.customerName)}</strong></p>
                        <p class="mb-1 text-muted">${escapeHtml(order.customerPhone)}</p>
                        ${order.userEmail ? `<p class="mb-0 text-muted small">${escapeHtml(order.userEmail)}</p>` : ''}
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3"><i class="bi bi-calendar-check text-primary"></i> Самовывоз</h6>
                        <p class="mb-1"><strong>${new Date(order.pickupDate).toLocaleDateString('ru-RU')}</strong></p>
                        <p class="mb-1 text-muted">${escapeHtml(order.pickupTime?.substring(0,5) || '')}</p>
                        <span class="badge bg-${st.color}">${escapeHtml(st.text)}</span>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3"><i class="bi bi-box-seam text-primary"></i> Состав заказа</h6>
                        <table class="table table-sm">
                            <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
                            <tbody>
                                ${items.map(i => `
                                    <tr>
                                        <td>${escapeHtml(i.productName)}</td>
                                        <td>${i.quantity}</td>
                                        <td>${Number(i.price).toLocaleString()} ₽</td>
                                        <td class="fw-bold">${Number(i.price * i.quantity).toLocaleString()} ₽</td>
                                    </tr>`).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end fw-bold">Итого:</td>
                                    <td class="fw-bold text-primary">${Number(order.totalAmount).toLocaleString()} ₽</td>
                                </tr>
                            </tfoot>
                        </table>
                        ${order.orderNotes ? `<p class="text-muted small mb-0"><strong>Примечание:</strong> ${escapeHtml(order.orderNotes)}</p>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('backToOrders').addEventListener('click', loadOrders);
}

// ==================== ТОВАРЫ ====================
async function loadProducts() {
    try {
        const data = await API.get('/shop/products?limit=100');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Товары (${data.total})</h5>
                    <button class="btn btn-primary rounded-pill" id="addProductBtn">
                        <i class="bi bi-plus-lg"></i> Добавить товар
                    </button>
                </div>
                ${data.products.length === 0 ? '<p class="text-muted">Нет товаров</p>' : `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead><tr><th>ID</th><th>Фото</th><th>Название</th><th>Цена</th><th>Остаток</th><th>Действия</th></tr></thead>
                        <tbody>${data.products.map(p => `
                            <tr>
                                <td>${escapeHtml(p.productId)}</td>
                                <td>
                                    ${safeUrl(p.mainImage) ? `
                                        <img src="${safeUrl(p.mainImage)}" style="width:50px;height:50px;object-fit:cover" class="rounded-2">
                                    ` : `
                                        <div class="bg-light rounded-2 d-flex align-items-center justify-content-center" style="width:50px;height:50px">
                                            <i class="bi bi-image text-muted"></i>
                                        </div>
                                    `}
                                </td>
                                <td>${escapeHtml(p.productName)}</td>
                                <td>${Number(p.productPrice).toLocaleString()} ₽</td>
                                <td>${p.stockQuantity}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary rounded-pill edit-product" data-id="${p.productId}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger rounded-pill delete-product" data-id="${p.productId}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}`;

            document.getElementById('addProductBtn').addEventListener('click', showAddProductForm);
            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Удалить товар?')) {
                        try {
                            await API.delete('/shop/products/' + btn.dataset.id);
                            loadProducts();
                        } catch (err) {
                            alert(err.message || 'Ошибка удаления товара');
                        }
                    }
                });
            });
            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', () => showEditProductForm(btn.dataset.id));
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function showAddProductForm() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новый товар</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToProducts">← Назад</button>
        </div>
        <form id="productForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название</label>
                    <input type="text" class="form-control" id="productName" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-semibold">Цена ₽</label>
                    <input type="number" class="form-control" id="productPrice" min="0" step="0.01" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-semibold">Количество</label>
                    <input type="number" class="form-control" id="stockQuantity" min="0" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Категория</label>
                    <select class="form-select" id="categoryId">
                        <option value="">Без категории</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Скидка ₽ (необязательно)</label>
                    <input type="number" class="form-control" id="productDiscountPrice" min="0" step="0.01">
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Описание</label>
                    <textarea class="form-control" id="productDescription" rows="4"></textarea>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Фотографии товара</label>
                    <input type="file" class="form-control" id="productImages" accept="image/*" multiple>
                    <small class="text-muted">Первое фото станет главным. Максимум 10 фото.</small>
                    <div class="row g-2 mt-2" id="imagePreview"></div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveProductBtn">
                <i class="bi bi-check-lg"></i> Сохранить
            </button>
        </form>`;

    document.getElementById('backToProducts').addEventListener('click', loadProducts);
    loadCategoriesToSelect();
    setupImagePreview('productImages', 'imagePreview');

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('saveProductBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

        const imageInput = document.getElementById('productImages');
        let images = [];

        if (imageInput.files.length > 0) {
            const formData = new FormData();
            for (const file of imageInput.files) {
                formData.append('files', file);
            }
            formData.append('folder', 'products');

            try {
                const uploadRes = await API.upload('/upload/multiple', formData);
                if (uploadRes.success) images = uploadRes.files;
            } catch (err) {
                alert('Ошибка загрузки фото: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
                return;
            }
        }

        const data = {
            productName: document.getElementById('productName').value.trim(),
            productPrice: parseFloat(document.getElementById('productPrice').value),
            stockQuantity: parseInt(document.getElementById('stockQuantity').value),
            categoryId: document.getElementById('categoryId').value || null,
            productDiscountPrice: document.getElementById('productDiscountPrice').value ? parseFloat(document.getElementById('productDiscountPrice').value) : null,
            productDescription: document.getElementById('productDescription').value.trim(),
            images
        };

        try {
            await API.post('/shop/products', data);
            loadProducts();
        } catch (e) {
            alert(e.message || 'Ошибка сохранения');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
        }
    });
}

async function showEditProductForm(productId) {
    try {
        const res = await API.get('/shop/products/' + productId);
        if (!res.success) {
            alert('Товар не найден');
            return;
        }

        const p = res.product;
        const existingImages = p.images || [];

        document.getElementById('sectionContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Редактирование: ${escapeHtml(p.productName)}</h5>
                <button class="btn btn-outline-secondary rounded-pill" id="backToProducts">← Назад</button>
            </div>
            <form id="editProductForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Название</label>
                        <input type="text" class="form-control" id="editProductName" value="${escapeHtml(p.productName)}" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-semibold">Цена ₽</label>
                        <input type="number" class="form-control" id="editProductPrice" value="${escapeHtml(p.productPrice)}" min="0" step="0.01" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-semibold">Количество</label>
                        <input type="number" class="form-control" id="editStockQuantity" value="${escapeHtml(p.stockQuantity)}" min="0" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Категория</label>
                        <select class="form-select" id="editCategoryId">
                            <option value="">Без категории</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Скидка ₽</label>
                        <input type="number" class="form-control" id="editDiscountPrice" value="${escapeHtml(p.productDiscountPrice || '')}" min="0" step="0.01">
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Описание</label>
                        <textarea class="form-control" id="editDescription" rows="4">${escapeHtml(p.productDescription || '')}</textarea>
                    </div>
                    
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Текущие фото</label>
                        <div class="row g-2" id="existingImages">
                            ${existingImages.length === 0 ? '<p class="text-muted small">Фото нет</p>' :
            existingImages.map(img => `
                                <div class="col-4 col-md-2">
                                    <div class="position-relative">
                                        <img src="${safeUrl(img.imageUrl)}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                                        ${img.isMain ? '<span class="badge bg-primary position-absolute top-0 start-0 m-1 small">Главное</span>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Заменить фото (если выбраны — старые удалятся)</label>
                        <input type="file" class="form-control" id="editProductImages" accept="image/*" multiple>
                        <small class="text-muted">Первое фото станет главным. Максимум 10 фото.</small>
                        <div class="row g-2 mt-2" id="editImagePreview"></div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveEditBtn">
                    <i class="bi bi-check-lg"></i> Обновить
                </button>
            </form>`;

        document.getElementById('backToProducts').addEventListener('click', loadProducts);
        loadCategoriesToSelect('editCategoryId', p.categoryId);
        setupImagePreview('editProductImages', 'editImagePreview');

        document.getElementById('editProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('saveEditBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

            const imageInput = document.getElementById('editProductImages');
            let images = undefined;

            if (imageInput.files.length > 0) {
                const formData = new FormData();
                for (const file of imageInput.files) {
                    formData.append('files', file);
                }
                formData.append('folder', 'products');

                try {
                    const uploadRes = await API.upload('/upload/multiple', formData);
                    if (uploadRes.success) images = uploadRes.files;
                } catch (err) {
                    alert('Ошибка загрузки фото: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
                    return;
                }
            }

            const updateData = {
                productName: document.getElementById('editProductName').value.trim(),
                productPrice: parseFloat(document.getElementById('editProductPrice').value),
                stockQuantity: parseInt(document.getElementById('editStockQuantity').value),
                categoryId: document.getElementById('editCategoryId').value || null,
                productDiscountPrice: document.getElementById('editDiscountPrice').value ? parseFloat(document.getElementById('editDiscountPrice').value) : null,
                productDescription: document.getElementById('editDescription').value.trim()
            };

            if (images !== undefined) updateData.images = images;

            try {
                await API.put('/shop/products/' + productId, updateData);
                loadProducts();
            } catch (e) {
                alert(e.message || 'Ошибка обновления');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
            }
        });
    } catch (e) {
        alert('Ошибка загрузки товара');
    }
}

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        const files = Array.from(input.files).slice(0, 10);

        files.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `
                    <div class="col-4 col-md-2">
                        <div class="position-relative">
                            <img src="${e.target.result}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                            ${i === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-1 small">Главное</span>' : ''}
                        </div>
                    </div>`;
            };
            reader.readAsDataURL(file);
        });
    });
}

async function loadCategoriesToSelect(selectId = 'categoryId', selectedId = null) {
    try {
        const data = await API.get('/shop/categories');
        const select = document.getElementById(selectId);
        if (data.success && select) {
            function render(cats, level = 0) {
                cats.forEach(cat => {
                    select.innerHTML += `<option value="${escapeHtml(cat.categoryId)}" ${cat.categoryId == selectedId ? 'selected' : ''}>${'—'.repeat(level)} ${escapeHtml(cat.categoryName)}</option>`;
                    if (cat.children) render(cat.children, level + 1);
                });
            }
            render(data.categories);
        }
    } catch (e) {}
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================
async function loadUsers() {
    try {
        const data = await API.get('/admin/users');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <h5>Пользователи (${data.total || data.users?.length || 0})</h5>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th></tr></thead>
                        <tbody>${(data.users || []).map(u => `
                            <tr>
                                <td>${escapeHtml(u.userId)}</td>
                                <td>${escapeHtml(u.userFirstName)} ${escapeHtml(u.userLastName)}</td>
                                <td>${escapeHtml(u.userEmail)}</td>
                                <td><span class="badge bg-primary">${escapeHtml(u.role)}</span></td>
                                <td>${u.isActive ? '<span class="badge bg-success">Активен</span>' : '<span class="badge bg-danger">Заблокирован</span>'}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

// ==================== ОДОБРЕНИЕ ВРАЧЕЙ ====================
async function loadPendingDoctors() {
    try {
        const data = await API.get('/admin/users?role=doctor&doctorStatus=pending');
        if (data.success) {
            const doctors = data.users || [];
            document.getElementById('sectionContent').innerHTML = `
                <h5>Врачи на проверке (${doctors.length})</h5>
                ${doctors.length === 0 ? '<p class="text-muted">Нет врачей на проверке</p>' :
                doctors.map(d => `
                    <div class="card mb-2 p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${escapeHtml(d.userFirstName)} ${escapeHtml(d.userLastName)}</strong>
                                <small class="text-muted ms-2">${escapeHtml(d.userEmail)}</small>
                            </div>
                            <div>
                                <button class="btn btn-success btn-sm rounded-pill approve-doctor" data-id="${escapeHtml(d.userId)}">Одобрить</button>
                                <button class="btn btn-danger btn-sm rounded-pill reject-doctor" data-id="${escapeHtml(d.userId)}">Отклонить</button>
                            </div>
                        </div>
                    </div>`).join('')}`;

            document.querySelectorAll('.approve-doctor').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.put('/admin/users/' + btn.dataset.id, { doctorStatus: 'approved' });
                        loadPendingDoctors();
                    } catch (err) {
                        alert(err.message || 'Ошибка');
                    }
                });
            });
            document.querySelectorAll('.reject-doctor').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.put('/admin/users/' + btn.dataset.id, { doctorStatus: 'rejected' });
                        loadPendingDoctors();
                    } catch (err) {
                        alert(err.message || 'Ошибка');
                    }
                });
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

// ==================== УСЛУГИ ====================
async function loadServices() {
    try {
        const data = await API.get('/services');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Услуги (${data.services.length})</h5>
                    <button class="btn btn-primary rounded-pill" id="addServiceBtn">
                        <i class="bi bi-plus-lg"></i> Добавить услугу
                    </button>
                </div>
                ${data.services.length === 0 ? '<p class="text-muted">Нет услуг</p>' : `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead><tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Категория</th>
                            <th>Цена</th>
                            <th>Длительность</th>
                            <th>Действия</th>
                        </tr></thead>
                        <tbody>${data.services.map(s => `
                            <tr>
                                <td>${escapeHtml(s.serviceId)}</td>
                                <td>${escapeHtml(s.serviceName)}</td>
                                <td><span class="badge bg-primary bg-opacity-10 text-primary">${escapeHtml(s.categoryName || '—')}</span></td>
                                <td>${Number(s.servicePrice).toLocaleString()} ₽</td>
                                <td>${s.durationMinutes} мин</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary rounded-pill edit-service" data-id="${s.serviceId}"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger rounded-pill delete-service" data-id="${s.serviceId}"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`}`;

            document.getElementById('addServiceBtn').addEventListener('click', showAddServiceForm);
            document.querySelectorAll('.edit-service').forEach(btn => {
                btn.addEventListener('click', () => showEditServiceForm(btn.dataset.id));
            });
            document.querySelectorAll('.delete-service').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Удалить услугу?')) {
                        try {
                            await API.delete('/services/' + btn.dataset.id);
                            loadServices();
                        } catch (err) {
                            alert(err.message || 'Ошибка удаления услуги');
                        }
                    }
                });
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function showAddServiceForm() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новая услуга</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToServices">← Назад</button>
        </div>
        <form id="serviceForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название</label>
                    <input type="text" class="form-control" id="serviceName" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Категория</label>
                    <select class="form-select" id="serviceCategoryId">
                        <option value="">Без категории</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-semibold">Цена ₽</label>
                    <input type="number" class="form-control" id="servicePrice" min="0" step="0.01" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-semibold">Длительность (мин)</label>
                    <input type="number" class="form-control" id="durationMinutes" min="5" value="30" required>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Описание</label>
                    <textarea class="form-control" id="serviceDescription" rows="4"></textarea>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3">
                <i class="bi bi-check-lg"></i> Сохранить
            </button>
        </form>`;

    document.getElementById('backToServices').addEventListener('click', loadServices);
    loadServiceCategories('serviceCategoryId');

    document.getElementById('serviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            serviceName: document.getElementById('serviceName').value.trim(),
            servicePrice: parseFloat(document.getElementById('servicePrice').value),
            durationMinutes: parseInt(document.getElementById('durationMinutes').value),
            serviceDescription: document.getElementById('serviceDescription').value.trim(),
            categoryId: document.getElementById('serviceCategoryId').value || null
        };
        try {
            await API.post('/services', data);
            loadServices();
        } catch (e) {
            alert(e.message || 'Ошибка сохранения');
        }
    });
}

async function showEditServiceForm(serviceId) {
    try {
        const res = await API.get('/services/' + serviceId);
        if (!res.success) return alert('Услуга не найдена');
        const s = res.service;

        document.getElementById('sectionContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Редактирование: ${escapeHtml(s.serviceName)}</h5>
                <button class="btn btn-outline-secondary rounded-pill" id="backToServices">← Назад</button>
            </div>
            <form id="editServiceForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Название</label>
                        <input type="text" class="form-control" id="editServiceName" value="${escapeHtml(s.serviceName)}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Категория</label>
                        <select class="form-select" id="editServiceCategoryId">
                            <option value="">Без категории</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-semibold">Цена ₽</label>
                        <input type="number" class="form-control" id="editServicePrice" value="${escapeHtml(s.servicePrice)}" min="0" step="0.01" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-semibold">Длительность (мин)</label>
                        <input type="number" class="form-control" id="editDuration" value="${escapeHtml(s.durationMinutes)}" min="5" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Описание</label>
                        <textarea class="form-control" id="editServiceDesc" rows="4">${escapeHtml(s.serviceDescription || '')}</textarea>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3">
                    <i class="bi bi-check-lg"></i> Обновить
                </button>
            </form>`;

        document.getElementById('backToServices').addEventListener('click', loadServices);
        loadServiceCategories('editServiceCategoryId', s.categoryId);

        document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                serviceName: document.getElementById('editServiceName').value.trim(),
                servicePrice: parseFloat(document.getElementById('editServicePrice').value),
                durationMinutes: parseInt(document.getElementById('editDuration').value),
                serviceDescription: document.getElementById('editServiceDesc').value.trim(),
                categoryId: document.getElementById('editServiceCategoryId').value || null
            };
            try {
                await API.put('/services/' + serviceId, data);
                loadServices();
            } catch (e) {
                alert(e.message || 'Ошибка обновления');
            }
        });
    } catch (e) {
        alert('Ошибка загрузки');
    }
}

// ==================== КАТЕГОРИИ ====================
let categoriesType = 'products';

async function loadCategoriesAdmin() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Категории</h5>
            <button class="btn btn-primary rounded-pill" id="addCategoryBtn">
                <i class="bi bi-plus-lg"></i> Добавить категорию
            </button>
        </div>
        
        <ul class="nav nav-pills mb-3" id="categoriesTabs">
            <li class="nav-item">
                <button class="nav-link active" data-type="products">
                    <i class="bi bi-box-seam"></i> Товары
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-type="services">
                    <i class="bi bi-clipboard2-pulse"></i> Услуги
                </button>
            </li>
        </ul>
        
        <div id="categoriesList">
            <p class="text-muted">Загрузка...</p>
        </div>
    `;

    document.getElementById('addCategoryBtn').addEventListener('click', showAddCategoryForm);

    document.querySelectorAll('#categoriesTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#categoriesTabs .nav-link').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            categoriesType = tab.dataset.type;
            renderCategoriesList();
        });
    });

    renderCategoriesList();
}

async function renderCategoriesList() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '<p class="text-muted">Загрузка...</p>';

    try {
        const endpoint = categoriesType === 'products' ? '/shop/categories' : '/services/categories';
        const data = await API.get(endpoint);

        if (!data.success) throw new Error('Ошибка');

        const categories = categoriesType === 'products'
            ? flattenTree(data.categories)
            : data.categories;

        if (categories.length === 0) {
            container.innerHTML = '<p class="text-muted">Категорий нет</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead><tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Описание</th>
                        <th>Действия</th>
                    </tr></thead>
                    <tbody>${categories.map(c => `
                        <tr>
                            <td>${escapeHtml(c.categoryId)}</td>
                            <td>${c._indent || ''}${escapeHtml(c.categoryName)}</td>
                            <td class="text-muted small">${escapeHtml((c.categoryDescription || '').substring(0, 60))}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary rounded-pill edit-category" data-id="${c.categoryId}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger rounded-pill delete-category" data-id="${c.categoryId}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;

        document.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', () => showEditCategoryForm(btn.dataset.id));
        });
        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить категорию?')) {
                    const url = categoriesType === 'products'
                        ? '/shop/categories/'
                        : '/services/categories/';
                    try {
                        await API.delete(url + btn.dataset.id);
                        renderCategoriesList();
                    } catch (err) {
                        alert(err.message || 'Ошибка удаления категории');
                    }
                }
            });
        });
    } catch (e) {
        container.innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function flattenTree(categories, level = 0) {
    const result = [];
    categories.forEach(cat => {
        result.push({ ...cat, _indent: '— '.repeat(level) });
        if (cat.children && cat.children.length > 0) {
            result.push(...flattenTree(cat.children, level + 1));
        }
    });
    return result;
}

function showAddCategoryForm() {
    const endpoint = categoriesType === 'products' ? '/shop/categories' : '/services/categories';
    const title = categoriesType === 'products' ? 'товара' : 'услуги';

    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новая категория ${title}</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToCategories">← Назад</button>
        </div>
        <form id="categoryForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название</label>
                    <input type="text" class="form-control" id="categoryName" required>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Описание</label>
                    <textarea class="form-control" id="categoryDescription" rows="3"></textarea>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3">
                <i class="bi bi-check-lg"></i> Сохранить
            </button>
        </form>`;

    document.getElementById('backToCategories').addEventListener('click', loadCategoriesAdmin);

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            categoryName: document.getElementById('categoryName').value.trim(),
            categoryDescription: document.getElementById('categoryDescription').value.trim()
        };
        try {
            await API.post(endpoint, data);
            loadCategoriesAdmin();
        } catch (err) {
            alert(err.message || 'Ошибка сохранения');
        }
    });
}

async function showEditCategoryForm(categoryId) {
    const endpoint = categoriesType === 'products' ? '/shop/categories' : '/services/categories';

    const data = await API.get(endpoint);
    let category = null;

    if (categoriesType === 'products') {
        const flat = flattenTree(data.categories);
        category = flat.find(c => c.categoryId == categoryId);
    } else {
        category = data.categories.find(c => c.categoryId == categoryId);
    }

    if (!category) return alert('Категория не найдена');

    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Редактирование: ${escapeHtml(category.categoryName)}</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToCategories">← Назад</button>
        </div>
        <form id="editCategoryForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название</label>
                    <input type="text" class="form-control" id="editCategoryName" value="${escapeHtml(category.categoryName)}" required>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Описание</label>
                    <textarea class="form-control" id="editCategoryDescription" rows="3">${escapeHtml(category.categoryDescription || '')}</textarea>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3">
                <i class="bi bi-check-lg"></i> Обновить
            </button>
        </form>`;

    document.getElementById('backToCategories').addEventListener('click', loadCategoriesAdmin);

    document.getElementById('editCategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const updateData = {
            categoryName: document.getElementById('editCategoryName').value.trim(),
            categoryDescription: document.getElementById('editCategoryDescription').value.trim()
        };
        try {
            await API.put(endpoint + '/' + categoryId, updateData);
            loadCategoriesAdmin();
        } catch (err) {
            alert(err.message || 'Ошибка обновления');
        }
    });
}

async function loadServiceCategories(selectId, selectedId = null) {
    try {
        const data = await API.get('/services/categories');
        const select = document.getElementById(selectId);
        if (data.success && select) {
            data.categories.forEach(cat => {
                select.innerHTML += `<option value="${escapeHtml(cat.categoryId)}" ${cat.categoryId == selectedId ? 'selected' : ''}>${escapeHtml(cat.categoryName)}</option>`;
            });
        }
    } catch (e) {}
}

// ==================== ИНФОСТЕНД ====================
async function loadPosts() {
    try {
        const data = await API.get('/blog/admin/all');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Посты (${data.total})</h5>
                    <button class="btn btn-primary rounded-pill" id="addPostBtn">
                        <i class="bi bi-plus-lg"></i> Добавить пост
                    </button>
                </div>
                ${data.posts.length === 0 ? '<p class="text-muted">Постов нет</p>' : `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr>
                            <th>ID</th>
                            <th>Обложка</th>
                            <th>Заголовок</th>
                            <th>Тип</th>
                            <th>Просмотры</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr></thead>
                        <tbody>${data.posts.map(p => {
                const cover = p.media && p.media[0] ? safeUrl(p.media[0].mediaUrl) : '';
                return `
                            <tr>
                                <td>${p.postId}</td>
                                <td>
                                    ${cover ? `
                                        <img src="${cover}" style="width:60px;height:40px;object-fit:cover" class="rounded-2">
                                    ` : `
                                        <div class="bg-light rounded-2 d-flex align-items-center justify-content-center" style="width:60px;height:40px">
                                            <i class="bi bi-image text-muted"></i>
                                        </div>
                                    `}
                                </td>
                                <td>${escapeHtml(p.postTitle)}</td>
                                <td><span class="badge bg-primary">${p.postType === 'reel' ? '🎬 Рилс' : '📝 Статья'}</span></td>
                                <td>${p.postViews}</td>
                                <td>${p.isPublished ? '<span class="badge bg-success">Опубликован</span>' : '<span class="badge bg-secondary">Черновик</span>'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary rounded-pill edit-post" data-id="${p.postId}"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger rounded-pill delete-post" data-id="${p.postId}"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>`;
            }).join('')}
                        </tbody>
                    </table>
                </div>`}`;

            document.getElementById('addPostBtn').addEventListener('click', showAddPostForm);
            document.querySelectorAll('.edit-post').forEach(btn => {
                btn.addEventListener('click', () => showEditPostForm(btn.dataset.id));
            });
            document.querySelectorAll('.delete-post').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Удалить пост?')) {
                        try {
                            await API.delete('/blog/' + btn.dataset.id);
                            loadPosts();
                        } catch (err) {
                            alert(err.message || 'Ошибка удаления поста');
                        }
                    }
                });
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function showAddPostForm() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новый пост</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToPosts">← Назад</button>
        </div>
        <form id="postForm">
            <div class="row g-3">
                <div class="col-md-8">
                    <label class="form-label small fw-semibold">Заголовок</label>
                    <input type="text" class="form-control" id="postTitle" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-semibold">Тип</label>
                    <select class="form-select" id="postType">
                        <option value="article">📝 Статья</option>
                        <option value="reel">🎬 Рилс</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Содержание</label>
                    <textarea class="form-control" id="postContent" rows="8"></textarea>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Медиа (фото/видео)</label>
                    <input type="file" class="form-control" id="postMedia" accept="image/*,video/*" multiple>
                    <small class="text-muted">Первое фото станет обложкой</small>
                    <div class="row g-2 mt-2" id="postMediaPreview"></div>
                </div>
                <div class="col-12">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="postPublished">
                        <label class="form-check-label" for="postPublished">Опубликовать сразу</label>
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="savePostBtn">
                <i class="bi bi-check-lg"></i> Сохранить
            </button>
        </form>`;

    document.getElementById('backToPosts').addEventListener('click', loadPosts);
    setupPostMediaPreview();

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('savePostBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

        const mediaInput = document.getElementById('postMedia');
        let media = [];

        if (mediaInput.files.length > 0) {
            const formData = new FormData();
            for (const file of mediaInput.files) {
                formData.append('files', file);
            }
            formData.append('folder', 'posts');

            try {
                const uploadRes = await API.upload('/upload/multiple', formData);
                if (uploadRes.success) {
                    media = uploadRes.files.map((f, i) => ({
                        url: f.url,
                        key: f.key,
                        type: mediaInput.files[i].type.startsWith('video') ? 'video' : 'image'
                    }));
                }
            } catch (err) {
                alert('Ошибка загрузки медиа: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
                return;
            }
        }

        const data = {
            postTitle: document.getElementById('postTitle').value.trim(),
            postContent: document.getElementById('postContent').value.trim(),
            postType: document.getElementById('postType').value,
            isPublished: document.getElementById('postPublished').checked,
            media
        };

        try {
            await API.post('/blog', data);
            loadPosts();
        } catch (e) {
            alert(e.message || 'Ошибка сохранения');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
        }
    });
}

async function showEditPostForm(postId) {
    try {
        const res = await API.get('/blog/' + postId);
        if (!res.success) return alert('Пост не найден');
        const p = res.post;

        document.getElementById('sectionContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Редактирование: ${escapeHtml(p.postTitle)}</h5>
                <button class="btn btn-outline-secondary rounded-pill" id="backToPosts">← Назад</button>
            </div>
            <form id="editPostForm">
                <div class="row g-3">
                    <div class="col-md-8">
                        <label class="form-label small fw-semibold">Заголовок</label>
                        <input type="text" class="form-control" id="editPostTitle" value="${escapeHtml(p.postTitle)}" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-semibold">Тип</label>
                        <select class="form-select" id="editPostType">
                            <option value="article" ${p.postType === 'article' ? 'selected' : ''}>📝 Статья</option>
                            <option value="reel" ${p.postType === 'reel' ? 'selected' : ''}>🎬 Рилс</option>
                        </select>
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Содержание</label>
                        <textarea class="form-control" id="editPostContent" rows="8">${escapeHtml(p.postContent || '')}</textarea>
                    </div>
                    ${p.media && p.media.length > 0 ? `
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Текущие медиа</label>
                            <div class="row g-2">
                                ${p.media.map(m => {
                                    const mediaSrc = safeUrl(m.mediaUrl);
                                    if (!mediaSrc) return '';
                                    return `
                                    <div class="col-4 col-md-2">
                                        ${m.mediaType === 'video' ? `
                                            <video src="${mediaSrc}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover" muted></video>
                                        ` : `
                                            <img src="${mediaSrc}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                                        `}
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Заменить медиа</label>
                        <input type="file" class="form-control" id="editPostMedia" accept="image/*,video/*" multiple>
                        <small class="text-muted">Если выбраны — старые удалятся</small>
                        <div class="row g-2 mt-2" id="editPostMediaPreview"></div>
                    </div>
                    <div class="col-12">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="editPostPublished" ${p.isPublished ? 'checked' : ''}>
                            <label class="form-check-label" for="editPostPublished">Опубликован</label>
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveEditPostBtn">
                    <i class="bi bi-check-lg"></i> Обновить
                </button>
            </form>`;

        document.getElementById('backToPosts').addEventListener('click', loadPosts);
        setupPostMediaPreview('editPostMedia', 'editPostMediaPreview');

        document.getElementById('editPostForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('saveEditPostBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

            const mediaInput = document.getElementById('editPostMedia');
            let media = undefined;

            if (mediaInput.files.length > 0) {
                const formData = new FormData();
                for (const file of mediaInput.files) {
                    formData.append('files', file);
                }
                formData.append('folder', 'posts');

                try {
                    const uploadRes = await API.upload('/upload/multiple', formData);
                    if (uploadRes.success) {
                        media = uploadRes.files.map((f, i) => ({
                            url: f.url,
                            key: f.key,
                            type: mediaInput.files[i].type.startsWith('video') ? 'video' : 'image'
                        }));
                    }
                } catch (err) {
                    alert('Ошибка загрузки: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
                    return;
                }
            }

            const updateData = {
                postTitle: document.getElementById('editPostTitle').value.trim(),
                postContent: document.getElementById('editPostContent').value.trim(),
                postType: document.getElementById('editPostType').value,
                isPublished: document.getElementById('editPostPublished').checked
            };

            if (media !== undefined) updateData.media = media;

            try {
                await API.put('/blog/' + postId, updateData);
                loadPosts();
            } catch (e) {
                alert(e.message || 'Ошибка обновления');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
            }
        });
    } catch (e) {
        alert('Ошибка загрузки поста');
    }
}

function setupPostMediaPreview(inputId = 'postMedia', previewId = 'postMediaPreview') {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        const files = Array.from(input.files).slice(0, 10);

        files.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const isVideo = file.type.startsWith('video');
                preview.innerHTML += `
                    <div class="col-4 col-md-2">
                        <div class="position-relative">
                            ${isVideo ? `
                                <video src="${e.target.result}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover" muted></video>
                            ` : `
                                <img src="${e.target.result}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                            `}
                            ${i === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-1 small">Обложка</span>' : ''}
                        </div>
                    </div>`;
            };
            reader.readAsDataURL(file);
        });
    });
}

// ==================== ГАЛЕРЕЯ ====================
async function loadGallery() {
    try {
        const data = await API.get('/gallery/admin/albums');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Альбомы (${data.albums.length})</h5>
                    <button class="btn btn-primary rounded-pill" id="addAlbumBtn">
                        <i class="bi bi-plus-lg"></i> Добавить альбом
                    </button>
                </div>
                ${data.albums.length === 0 ? '<p class="text-muted">Альбомов нет</p>' : `
                <div class="row g-3">
                    ${data.albums.map(a => {
                        const coverUrl = safeUrl(a.coverImageUrl);
                        return `
                        <div class="col-6 col-md-4 col-lg-3">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="position-relative" style="aspect-ratio:1;overflow:hidden">
                                    ${coverUrl ? `
                                        <img src="${coverUrl}" class="w-100 h-100" style="object-fit:cover">
                                    ` : `
                                        <div class="bg-light d-flex align-items-center justify-content-center h-100">
                                            <i class="bi bi-images text-muted fs-1"></i>
                                        </div>
                                    `}
                                    <span class="badge bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2">
                                        ${a.photoCount} фото
                                    </span>
                                </div>
                                <div class="card-body py-2">
                                    <h6 class="fw-bold mb-2 text-truncate">${escapeHtml(a.albumName)}</h6>
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-sm btn-outline-primary rounded-pill flex-grow-1 edit-album" data-id="${a.albumId}">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger rounded-pill delete-album" data-id="${a.albumId}">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `; }).join('')}
                </div>`}`;

            document.getElementById('addAlbumBtn').addEventListener('click', showAddAlbumForm);
            document.querySelectorAll('.edit-album').forEach(btn => {
                btn.addEventListener('click', () => showEditAlbumForm(btn.dataset.id));
            });
            document.querySelectorAll('.delete-album').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Удалить альбом со всеми фото?')) {
                        try {
                            await API.delete('/gallery/albums/' + btn.dataset.id);
                            loadGallery();
                        } catch (err) {
                            alert(err.message || 'Ошибка удаления альбома');
                        }
                    }
                });
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function showAddAlbumForm() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новый альбом</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToGallery">← Назад</button>
        </div>
        <form id="albumForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название альбома</label>
                    <input type="text" class="form-control" id="albumName" placeholder="Например: Наши пациенты" required>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Фотографии</label>
                    <input type="file" class="form-control" id="albumPhotos" accept="image/*" multiple required>
                    <small class="text-muted">Первое фото станет обложкой. Максимум 30 фото.</small>
                    <div class="row g-2 mt-3" id="albumPhotosPreview"></div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveAlbumBtn">
                <i class="bi bi-check-lg"></i> Создать альбом
            </button>
        </form>`;

    document.getElementById('backToGallery').addEventListener('click', loadGallery);
    setupAlbumPhotosPreview();

    document.getElementById('albumForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('saveAlbumBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Загрузка...';

        const photosInput = document.getElementById('albumPhotos');
        if (photosInput.files.length === 0) {
            alert('Выберите хотя бы одно фото');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Создать альбом';
            return;
        }

        let photos = [];
        const fd = new FormData();
        for (const file of photosInput.files) fd.append('files', file);
        fd.append('folder', 'gallery');

        try {
            const up = await API.upload('/upload/multiple', fd);
            if (up.success) photos = up.files;
            else throw new Error('Ошибка загрузки');
        } catch (err) {
            alert('Ошибка загрузки фото: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Создать альбом';
            return;
        }

        try {
            await API.post('/gallery/albums', {
                albumName: document.getElementById('albumName').value.trim(),
                photos
            });
            loadGallery();
        } catch (err) {
            alert(err.message || 'Ошибка');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Создать альбом';
        }
    });
}

async function showEditAlbumForm(albumId) {
    try {
        const res = await API.get('/gallery/albums/' + albumId);
        if (!res.success) return alert('Альбом не найден');
        const a = res.album;

        document.getElementById('sectionContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Редактирование: ${escapeHtml(a.albumName)}</h5>
                <button class="btn btn-outline-secondary rounded-pill" id="backToGallery">← Назад</button>
            </div>
            <form id="editAlbumForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Название</label>
                        <input type="text" class="form-control" id="editAlbumName" value="${escapeHtml(a.albumName)}" required>
                    </div>
                    
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Текущие фото (${a.photos ? a.photos.length : 0})</label>
                        <div class="row g-2">
                            ${(a.photos || []).map(p => {
                                const photoSrc = safeUrl(p.photoUrl);
                                return photoSrc ? `
                                <div class="col-4 col-md-2">
                                    <img src="${photoSrc}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                                </div>
                            ` : '';
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Заменить все фото</label>
                        <input type="file" class="form-control" id="editAlbumPhotos" accept="image/*" multiple>
                        <small class="text-muted">Если выбрать новые — все старые удалятся</small>
                        <div class="row g-2 mt-3" id="editAlbumPhotosPreview"></div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveEditAlbumBtn">
                    <i class="bi bi-check-lg"></i> Обновить
                </button>
            </form>`;

        document.getElementById('backToGallery').addEventListener('click', loadGallery);
        setupAlbumPhotosPreview('editAlbumPhotos', 'editAlbumPhotosPreview');

        document.getElementById('editAlbumForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('saveEditAlbumBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

            const updateData = {
                albumName: document.getElementById('editAlbumName').value.trim()
            };

            const photosInput = document.getElementById('editAlbumPhotos');
            if (photosInput.files.length > 0) {
                const fd = new FormData();
                for (const file of photosInput.files) fd.append('files', file);
                fd.append('folder', 'gallery');
                try {
                    const up = await API.upload('/upload/multiple', fd);
                    if (up.success) updateData.photos = up.files;
                } catch (err) {
                    alert('Ошибка загрузки: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
                    return;
                }
            }

            try {
                await API.put('/gallery/albums/' + albumId, updateData);
                loadGallery();
            } catch (err) {
                alert(err.message || 'Ошибка');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
            }
        });
    } catch (e) {
        alert('Ошибка загрузки');
    }
}

function setupAlbumPhotosPreview(inputId = 'albumPhotos', previewId = 'albumPhotosPreview') {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        const files = Array.from(input.files).slice(0, 30);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `
                    <div class="col-4 col-md-2">
                        <img src="${e.target.result}" class="img-fluid rounded-3" style="aspect-ratio:1;object-fit:cover">
                    </div>`;
            };
            reader.readAsDataURL(file);
        });
    });
}

// ==================== СЕРТИФИКАТЫ ====================
async function loadCertificates() {
    try {
        const data = await API.get('/certificates/admin/all');
        if (data.success) {
            document.getElementById('sectionContent').innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Сертификаты (${data.certificates.length})</h5>
                    <button class="btn btn-primary rounded-pill" id="addCertBtn">
                        <i class="bi bi-plus-lg"></i> Добавить сертификат
                    </button>
                </div>
                ${data.certificates.length === 0 ? '<p class="text-muted">Сертификатов нет</p>' : `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead><tr>
                            <th>ID</th>
                            <th>Превью</th>
                            <th>Название</th>
                            <th>Дата выдачи</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr></thead>
                        <tbody>${data.certificates.map(c => {
                const fileUrl = safeUrl(c.fileUrl);
                const isPDF = fileUrl && fileUrl.toLowerCase().endsWith('.pdf');
                const isImage = fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
                return `
                            <tr>
                                <td>${c.certificateId}</td>
                                <td>
                                    ${isImage ? `
                                        <img src="${fileUrl}" style="width:60px;height:40px;object-fit:cover" class="rounded-2">
                                    ` : isPDF ? `
                                        <div class="bg-danger bg-opacity-10 rounded-2 d-flex align-items-center justify-content-center" style="width:60px;height:40px">
                                            <i class="bi bi-file-pdf text-danger"></i>
                                        </div>
                                    ` : `
                                        <div class="bg-light rounded-2 d-flex align-items-center justify-content-center" style="width:60px;height:40px">
                                            <i class="bi bi-file text-muted"></i>
                                        </div>
                                    `}
                                </td>
                                <td>${escapeHtml(c.certificateName)}</td>
                                <td>${c.issueDate ? new Date(c.issueDate).toLocaleDateString('ru-RU') : '—'}</td>
                                <td>${c.isPublished ? '<span class="badge bg-success">Опубликован</span>' : '<span class="badge bg-secondary">Черновик</span>'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary rounded-pill edit-cert" data-id="${c.certificateId}"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-sm btn-outline-danger rounded-pill delete-cert" data-id="${c.certificateId}"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>`;
            }).join('')}
                        </tbody>
                    </table>
                </div>`}`;

            document.getElementById('addCertBtn').addEventListener('click', showAddCertificateForm);
            document.querySelectorAll('.edit-cert').forEach(btn => {
                btn.addEventListener('click', () => showEditCertificateForm(btn.dataset.id));
            });
            document.querySelectorAll('.delete-cert').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Удалить сертификат?')) {
                        try {
                            await API.delete('/certificates/' + btn.dataset.id);
                            loadCertificates();
                        } catch (err) {
                            alert(err.message || 'Ошибка удаления сертификата');
                        }
                    }
                });
            });
        }
    } catch (e) {
        document.getElementById('sectionContent').innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function showAddCertificateForm() {
    document.getElementById('sectionContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>Новый сертификат</h5>
            <button class="btn btn-outline-secondary rounded-pill" id="backToCerts">← Назад</button>
        </div>
        <form id="certForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Название</label>
                    <input type="text" class="form-control" id="certName" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-semibold">Дата выдачи</label>
                    <input type="date" class="form-control" id="certDate">
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Описание (необязательно)</label>
                    <textarea class="form-control" id="certDescription" rows="2"></textarea>
                </div>
                <div class="col-12">
                    <label class="form-label small fw-semibold">Файл (изображение или PDF)</label>
                    <input type="file" class="form-control" id="certFile" accept="image/*,.pdf" required>
                    <div class="mt-2" id="certFilePreview"></div>
                </div>
                <div class="col-12">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="certPublished" checked>
                        <label class="form-check-label" for="certPublished">Опубликовать</label>
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveCertBtn">
                <i class="bi bi-check-lg"></i> Сохранить
            </button>
        </form>`;

    document.getElementById('backToCerts').addEventListener('click', loadCertificates);
    setupCertFilePreview();

    document.getElementById('certForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('saveCertBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Загрузка...';

        const fileInput = document.getElementById('certFile');
        if (!fileInput.files[0]) {
            alert('Выберите файл');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
            return;
        }

        let fileUrl = null, fileKey = null;
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        fd.append('folder', 'certificates');

        try {
            const up = await API.upload('/upload/file', fd);
            if (up.success) {
                fileUrl = up.url;
                fileKey = up.key;
            } else throw new Error('Ошибка загрузки');
        } catch (err) {
            alert('Ошибка загрузки файла: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
            return;
        }

        try {
            await API.post('/certificates', {
                certificateName: document.getElementById('certName').value.trim(),
                certificateDescription: document.getElementById('certDescription').value.trim(),
                issueDate: document.getElementById('certDate').value || null,
                fileUrl,
                fileKey,
                isPublished: document.getElementById('certPublished').checked
            });
            loadCertificates();
        } catch (err) {
            alert(err.message || 'Ошибка');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
        }
    });
}

async function showEditCertificateForm(certId) {
    try {
        const res = await API.get('/certificates/' + certId);
        if (!res.success) return alert('Сертификат не найден');
        const c = res.certificate;

        const isPDF = c.fileUrl && c.fileUrl.toLowerCase().endsWith('.pdf');
        const isImage = c.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.fileUrl);

        const safeFileUrl = safeUrl(c.fileUrl);
        document.getElementById('sectionContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>Редактирование: ${escapeHtml(c.certificateName)}</h5>
                <button class="btn btn-outline-secondary rounded-pill" id="backToCerts">← Назад</button>
            </div>
            <form id="editCertForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Название</label>
                        <input type="text" class="form-control" id="editCertName" value="${escapeHtml(c.certificateName)}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold">Дата выдачи</label>
                        <input type="date" class="form-control" id="editCertDate" value="${c.issueDate ? escapeHtml(c.issueDate.substring(0,10)) : ''}">
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Описание</label>
                        <textarea class="form-control" id="editCertDescription" rows="2">${escapeHtml(c.certificateDescription || '')}</textarea>
                    </div>
                    
                    ${safeFileUrl ? `
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Текущий файл</label>
                            <div>
                                ${isImage ? `
                                    <img src="${safeFileUrl}" class="rounded-3" style="max-height:150px">
                                ` : isPDF ? `
                                    <a href="${safeFileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-danger rounded-pill">
                                        <i class="bi bi-file-pdf"></i> Открыть PDF
                                    </a>
                                ` : `
                                    <a href="${safeFileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary rounded-pill">
                                        Открыть файл
                                    </a>
                                `}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="col-12">
                        <label class="form-label small fw-semibold">Заменить файл</label>
                        <input type="file" class="form-control" id="editCertFile" accept="image/*,.pdf">
                        <div class="mt-2" id="editCertFilePreview"></div>
                    </div>
                    <div class="col-12">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="editCertPublished" ${c.isPublished ? 'checked' : ''}>
                            <label class="form-check-label" for="editCertPublished">Опубликован</label>
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4 mt-3" id="saveEditCertBtn">
                    <i class="bi bi-check-lg"></i> Обновить
                </button>
            </form>`;

        document.getElementById('backToCerts').addEventListener('click', loadCertificates);
        setupCertFilePreview('editCertFile', 'editCertFilePreview');

        document.getElementById('editCertForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('saveEditCertBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

            const updateData = {
                certificateName: document.getElementById('editCertName').value.trim(),
                certificateDescription: document.getElementById('editCertDescription').value.trim(),
                issueDate: document.getElementById('editCertDate').value || null,
                isPublished: document.getElementById('editCertPublished').checked
            };

            const fileInput = document.getElementById('editCertFile');
            if (fileInput.files[0]) {
                const fd = new FormData();
                fd.append('file', fileInput.files[0]);
                fd.append('folder', 'certificates');
                try {
                    const up = await API.upload('/upload/file', fd);
                    if (up.success) {
                        updateData.fileUrl = up.url;
                        updateData.fileKey = up.key;
                    }
                } catch (err) {
                    alert('Ошибка загрузки: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
                    return;
                }
            }

            try {
                await API.put('/certificates/' + certId, updateData);
                loadCertificates();
            } catch (err) {
                alert(err.message || 'Ошибка');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-lg"></i> Обновить';
            }
        });
    } catch (e) {
        alert('Ошибка загрузки');
    }
}

function setupCertFilePreview(inputId = 'certFile', previewId = 'certFilePreview') {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        const file = input.files[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            preview.innerHTML = `
                <div class="d-flex align-items-center gap-2 text-danger">
                    <i class="bi bi-file-pdf fs-3"></i>
                    <span>${escapeHtml(file.name)}</span>
                </div>`;
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" class="rounded-3" style="max-height:150px">`;
            };
            reader.readAsDataURL(file);
        }
    });
}