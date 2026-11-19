document.addEventListener('DOMContentLoaded', loadCart);

async function loadCart() {
    const container = document.getElementById('cartContent');

    try {
        const data = await API.get('/shop/cart');

        if (!data.success || data.items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-cart-x display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Корзина пуста</h4>
                    <p class="text-muted">Добавьте товары из магазина</p>
                    <a href="/shop.html" class="btn btn-primary rounded-pill px-4 mt-2">
                        <i class="bi bi-shop"></i> В магазин
                    </a>
                </div>`;
            return;
        }

        const total = data.items.reduce((sum, item) => {
            const price = item.productDiscountPrice || item.productPrice;
            return sum + (price * item.quantity);
        }, 0);

        const count = data.items.reduce((sum, item) => sum + item.quantity, 0);

        container.innerHTML = `
            <div class="row g-4">
                <div class="col-lg-8">
                    ${data.items.map(item => `
                        <div class="card border-0 shadow-sm mb-3" data-product-id="${item.productId}">
                            <div class="card-body p-3">
                                <div class="row align-items-center g-3">
                                    <div class="col-3 col-md-2">
                                        ${safeUrl(item.mainImage) ? `
                                            <img src="${safeUrl(item.mainImage)}" class="rounded-3 w-100" style="height:70px;object-fit:cover" alt="">
                                        ` : `
                                            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="height:70px">
                                                <i class="bi bi-image text-muted fs-3"></i>
                                            </div>
                                        `}
                                    </div>
                                    <div class="col-9 col-md-4">
                                        <h6 class="fw-bold mb-0">${escapeHtml(item.productName)}</h6>
                                        <small class="text-muted">${Number(item.productDiscountPrice || item.productPrice).toLocaleString()} ₽ / шт</small>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-outline-secondary btn-sm rounded-circle qty-btn" data-action="minus" data-id="${item.productId}" style="width:32px;height:32px;padding:0">
                                                <i class="bi bi-dash"></i>
                                            </button>
                                            <span class="fw-bold qty-value">${item.quantity}</span>
                                            <button class="btn btn-outline-secondary btn-sm rounded-circle qty-btn" data-action="plus" data-id="${item.productId}" style="width:32px;height:32px;padding:0">
                                                <i class="bi bi-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="col-4 col-md-2">
                                        <span class="fw-bold item-total">${Number((item.productDiscountPrice || item.productPrice) * item.quantity).toLocaleString()} ₽</span>
                                    </div>
                                    <div class="col-2 col-md-1 text-end">
                                        <button class="btn btn-outline-danger btn-sm rounded-circle remove-item" data-id="${item.productId}" style="width:32px;height:32px;padding:0">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm sticky-top" style="top:90px">
                        <div class="card-body p-4">
                            <h5 class="fw-bold mb-3">Итого</h5>
                            <div class="d-flex justify-content-between mb-2">
                                <span class="text-muted">Товаров:</span>
                                <span class="fw-semibold">${count} шт</span>
                            </div>
                            <div class="d-flex justify-content-between mb-3">
                                <span class="text-muted">Сумма:</span>
                                <span class="fw-semibold">${Number(total).toLocaleString()} ₽</span>
                            </div>
                            <button class="btn btn-accent w-100 rounded-pill py-2 fw-semibold" id="checkoutBtn">
                                <i class="bi bi-bag-check"></i> Оформить заказ
                            </button>
                            <button class="btn btn-outline-danger w-100 rounded-pill py-2 mt-2" id="clearCartBtn">
                                <i class="bi bi-trash"></i> Очистить корзину
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        setupCartEvents(data.items);
    } catch (e) {
        if (e.status === 401 || e.message.includes('401') || e.message.includes('авториз') || e.message.includes('Требуется')) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-person-lock display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Требуется вход</h4>
                    <p class="text-muted">Войдите чтобы просмотреть корзину</p>
                    <a href="/login.html" class="btn btn-primary rounded-pill px-4 mt-2">Войти</a>
                </div>`;
        } else {
            container.innerHTML = '<p class="text-danger">Ошибка загрузки корзины</p>';
        }
    }
}

function setupCartEvents(items) {
    // Изменение количества
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = btn.dataset.id;
            const item = items.find(i => i.productId == productId);
            const newQty = btn.dataset.action === 'plus' ? item.quantity + 1 : item.quantity - 1;

            if (newQty < 1) return;

            try {
                await API.put(`/shop/cart/${productId}`, { quantity: newQty });
                loadCart();
            } catch (e) {
                alert(e.message || 'Ошибка обновления');
            }
        });
    });

    // Удаление товара
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить товар из корзины?')) {
                await API.delete('/shop/cart/' + btn.dataset.id);
                loadCart();
            }
        });
    });

    // Очистка корзины
    document.getElementById('clearCartBtn').addEventListener('click', async () => {
        if (confirm('Очистить всю корзину?')) {
            await API.delete('/shop/cart');
            loadCart();
        }
    });

    // Оформление заказа
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });
}