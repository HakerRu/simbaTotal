let productQuantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        document.getElementById('productContent').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-box display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Товар не указан</h4>
                <a href="/shop.html" class="btn btn-primary rounded-pill px-4 mt-2">В магазин</a>
            </div>`;
        return;
    }

    await loadProduct(productId);
});

async function loadProduct(id) {
    const container = document.getElementById('productContent');

    try {
        const data = await API.get('/shop/products/' + id);

        if (!data.success || !data.product) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-box display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Товар не найден</h4>
                    <a href="/shop.html" class="btn btn-primary rounded-pill px-4 mt-2">В магазин</a>
                </div>`;
            return;
        }

        const p = data.product;
        const hasDiscount = p.productDiscountPrice && Number(p.productDiscountPrice) < Number(p.productPrice);
        const finalPrice = hasDiscount ? Number(p.productDiscountPrice) : Number(p.productPrice);
        const inStock = p.stockQuantity > 0;

        container.innerHTML = `
            <div class="row g-4 g-lg-5">
                <!-- Фото -->
                <div class="col-lg-6">
                    <div class="product-image-wrapper rounded-4 overflow-hidden shadow-sm bg-light" style="aspect-ratio:1">
                        ${safeUrl(p.mainImage) ? `
                            <img src="${safeUrl(p.mainImage)}" alt="${escapeHtml(p.productName)}" class="w-100 h-100" style="object-fit:cover">
                        ` : `
                            <div class="d-flex align-items-center justify-content-center h-100">
                                <i class="bi bi-image text-muted" style="font-size:6rem"></i>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Инфа -->
                <div class="col-lg-6">
                    ${p.categoryName ? `
                        <span class="badge bg-primary bg-opacity-10 text-primary mb-2 px-3 py-2 rounded-pill">${escapeHtml(p.categoryName)}</span>
                    ` : ''}
                    
                    <h1 class="fw-bold mb-3">${escapeHtml(p.productName)}</h1>
                    
                    <div class="d-flex align-items-center gap-3 mb-3">
                        ${hasDiscount ? `
                            <span class="text-decoration-line-through text-muted fs-5">${Number(p.productPrice).toLocaleString()} ₽</span>
                            <span class="fw-bold text-danger fs-3">${finalPrice.toLocaleString()} ₽</span>
                            <span class="badge bg-danger">-${Math.round((1 - finalPrice / Number(p.productPrice)) * 100)}%</span>
                        ` : `
                            <span class="fw-bold text-primary fs-3">${finalPrice.toLocaleString()} ₽</span>
                        `}
                    </div>

                    <div class="mb-3">
                        ${inStock ? `
                            <span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                                <i class="bi bi-check-circle"></i> В наличии (${p.stockQuantity} шт)
                            </span>
                        ` : `
                            <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill">
                                <i class="bi bi-x-circle"></i> Нет в наличии
                            </span>
                        `}
                    </div>

                    ${p.productDescription ? `
                        <h6 class="fw-bold mt-4 mb-2">Описание</h6>
                        <p class="text-muted" style="white-space:pre-line">${escapeHtml(p.productDescription)}</p>
                    ` : ''}

                    ${inStock ? `
                        <div class="d-flex align-items-center gap-3 mt-4 mb-3">
                            <label class="fw-semibold">Количество:</label>
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-outline-secondary btn-sm rounded-circle" id="qtyMinus" style="width:36px;height:36px;padding:0">
                                    <i class="bi bi-dash"></i>
                                </button>
                                <span class="fw-bold fs-5" id="qtyValue">1</span>
                                <button class="btn btn-outline-secondary btn-sm rounded-circle" id="qtyPlus" style="width:36px;height:36px;padding:0">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-lg rounded-pill px-4 fw-semibold" id="addToCartBtn">
                                <i class="bi bi-cart-plus"></i> В корзину
                            </button>
                            <a href="/shop.html" class="btn btn-outline-primary btn-lg rounded-pill px-4">
                                <i class="bi bi-arrow-left"></i> В магазин
                            </a>
                        </div>
                    ` : `
                        <div class="alert alert-warning mt-4">
                            <i class="bi bi-exclamation-triangle"></i> Товара нет в наличии. Загляните позже.
                        </div>
                    `}
                </div>
            </div>
        `;

        if (inStock) {
            setupProductEvents(p.productId, p.stockQuantity);
        }
    } catch (e) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h4 class="text-muted mt-3">Ошибка загрузки</h4>
                <a href="/shop.html" class="btn btn-primary rounded-pill px-4 mt-2">В магазин</a>
            </div>`;
    }
}

function setupProductEvents(productId, maxStock) {
    const qtyValue = document.getElementById('qtyValue');

    document.getElementById('qtyMinus').addEventListener('click', () => {
        if (productQuantity > 1) {
            productQuantity--;
            qtyValue.textContent = productQuantity;
        }
    });

    document.getElementById('qtyPlus').addEventListener('click', () => {
        if (productQuantity < maxStock) {
            productQuantity++;
            qtyValue.textContent = productQuantity;
        }
    });

    document.getElementById('addToCartBtn').addEventListener('click', async () => {
        try {
            const data = await API.post('/shop/cart/add', { productId, quantity: productQuantity });
            if (data.success) {
                showToast('Товар добавлен в корзину', 'success');
                updateCartCount();
            }
        } catch (e) {
            if (e.status === 401 || e.message.includes('401') || e.message.includes('авториз') || e.message.includes('Требуется')) {
                showToast('Войдите чтобы добавить в корзину', 'danger');
                setTimeout(() => window.location.href = '/login.html', 1000);
            } else {
                showToast(e.message || 'Ошибка', 'danger');
            }
        }
    });
}