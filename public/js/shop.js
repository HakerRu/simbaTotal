// Состояние магазина
let shopState = {
    products: [],
    categories: [],
    activeCategory: 'all',
    sort: 'default',
    search: '',
    page: 1,
    perPage: 9,
    totalPages: 0
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadProducts();
    setupEventListeners();
});

// Загрузка категорий
async function loadCategories() {
    try {
        const data = await API.get('/shop/categories');
        if (data.success) {
            shopState.categories = data.categories;
            renderCategories();
        }
    } catch (e) {
        console.error('Ошибка загрузки категорий:', e);
    }
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categoryList');

    let html = `
        <a href="#" class="list-group-item list-group-item-action border-0 rounded-3 mb-1 ${shopState.activeCategory === 'all' ? 'active' : ''}" data-category="all">
            <i class="bi bi-grid"></i> Все товары
        </a>`;

    function renderSubs(categories, level = 0) {
        categories.forEach(cat => {
            const padding = level * 16;
            html += `
                <a href="#" class="list-group-item list-group-item-action border-0 rounded-3 mb-1 ${shopState.activeCategory === cat.categoryId ? 'active' : ''}" 
                   data-category="${cat.categoryId}" style="padding-left:${16 + padding}px">
                    ${level > 0 ? '<i class="bi bi-arrow-return-right me-1 small"></i>' : '<i class="bi bi-folder me-1"></i>'}
                    ${cat.categoryName}
                </a>`;

            if (cat.children && cat.children.length > 0) {
                renderSubs(cat.children, level + 1);
            }
        });
    }

    renderSubs(shopState.categories);
    container.innerHTML = html;

    // Клики по категориям
    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            container.querySelectorAll('a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            shopState.activeCategory = link.dataset.category;
            shopState.page = 1;
            loadProducts();

            // На телефоне закрываем сайдбар
            if (window.innerWidth < 992) {
                bootstrap.Collapse.getInstance(document.getElementById('categorySidebar'))?.hide();
            }
        });
    });
}

// Загрузка товаров
async function loadProducts() {
    try {
        const params = new URLSearchParams({
            category: shopState.activeCategory,
            sort: shopState.sort,
            search: shopState.search,
            page: shopState.page,
            limit: shopState.perPage
        });

        const data = await API.get(`/shop/products?${params}`);
        if (data.success) {
            shopState.products = data.products;
            shopState.totalPages = Math.ceil(data.total / shopState.perPage);
            renderProducts();
            renderPagination();
            document.getElementById('productsCount').textContent = `Показано ${data.products.length} из ${data.total} товаров`;
        }
    } catch (e) {
        console.error('Ошибка загрузки товаров:', e);
    }
}

// Отрисовка товаров
function renderProducts() {
    const container = document.getElementById('productsGrid');

    if (shopState.products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Товары не найдены</h4>
                <p class="text-muted">Попробуйте изменить категорию или поисковый запрос</p>
            </div>`;
        return;
    }

    container.innerHTML = shopState.products.map(product => `
    <div class="col-6 col-md-4">
        <div class="card product-card border-0 shadow-sm h-100">
            <a href="/product.html?id=${product.productId}" class="text-decoration-none position-relative overflow-hidden d-block" style="height:200px">
                ${product.mainImage ? `
                    <img src="${product.mainImage}" class="w-100 h-100" alt="${product.productName}" style="object-fit:cover">
                ` : `
                    <div class="bg-light d-flex align-items-center justify-content-center h-100">
                        <i class="bi bi-image text-muted fs-1"></i>
                    </div>
                `}
                ${product.stockQuantity === 0 ? `
                    <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background:rgba(0,0,0,0.4)">
                        <span class="badge bg-danger fs-6">Нет в наличии</span>
                    </div>
                ` : ''}
                ${product.productDiscountPrice ? `
                    <span class="position-absolute top-0 end-0 badge bg-danger m-2">-${Math.round((1 - product.productDiscountPrice / product.productPrice) * 100)}%</span>
                ` : ''}
            </a>
            <div class="card-body d-flex flex-column">
                <span class="badge bg-primary bg-opacity-10 text-primary mb-2 align-self-start">${product.categoryName || 'Товар'}</span>
                <h6 class="card-title fw-bold">
                    <a href="/product.html?id=${product.productId}" class="text-decoration-none text-dark">${product.productName}</a>
                </h6>
                <p class="card-text text-muted small flex-grow-1 d-none d-md-block">${(product.productDescription || '').substring(0, 80)}...</p>
                <div class="mt-auto">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        ${product.productDiscountPrice ? `
                            <span class="text-decoration-line-through text-muted small">${Number(product.productPrice).toLocaleString()} ₽</span>
                            <span class="fw-bold text-danger">${Number(product.productDiscountPrice).toLocaleString()} ₽</span>
                        ` : `
                            <span class="fw-bold text-primary">${Number(product.productPrice).toLocaleString()} ₽</span>
                        `}
                    </div>
                    <button class="btn btn-primary btn-sm w-100 rounded-pill add-to-cart-btn" 
                            data-product-id="${product.productId}"
                            ${product.stockQuantity === 0 ? 'disabled' : ''}>
                        <i class="bi bi-cart-plus"></i> 
                        ${product.stockQuantity === 0 ? 'Нет в наличии' : 'В корзину'}
                    </button>
                </div>
            </div>
        </div>
    </div>
`).join('');

    // Обработчики кнопок
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addToCart(btn.dataset.productId);
        });
    });
}

// Добавление в корзину
async function addToCart(productId) {
    try {
        const data = await API.post('/shop/cart/add', { productId, quantity: 1 });
        if (data.success) {
            showToast('Товар добавлен в корзину', 'success');
            updateCartCount();
        }
    } catch (e) {
        if (e.message.includes('401') || e.message.includes('авториз')) {
            window.location.href = '../login.html';
        } else {
            showToast(e.message || 'Ошибка', 'danger');
        }
    }
}

// Пагинация
function renderPagination() {
    const nav = document.getElementById('paginationNav');
    const list = document.getElementById('paginationList');

    if (shopState.totalPages <= 1) {
        nav.style.display = 'none';
        return;
    }

    nav.style.display = 'block';
    let html = '';

    // Предыдущая
    html += `<li class="page-item ${shopState.page === 1 ? 'disabled' : ''}">
        <a class="page-link rounded-pill mx-1" href="#" data-page="${shopState.page - 1}"><i class="bi bi-chevron-left"></i></a>
    </li>`;

    // Страницы
    for (let i = 1; i <= shopState.totalPages; i++) {
        html += `<li class="page-item ${i === shopState.page ? 'active' : ''}">
            <a class="page-link rounded-pill mx-1" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    // Следующая
    html += `<li class="page-item ${shopState.page === shopState.totalPages ? 'disabled' : ''}">
        <a class="page-link rounded-pill mx-1" href="#" data-page="${shopState.page + 1}"><i class="bi bi-chevron-right"></i></a>
    </li>`;

    list.innerHTML = html;

    list.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (page >= 1 && page <= shopState.totalPages) {
                shopState.page = page;
                loadProducts();
                window.scrollTo({ top: 400, behavior: 'smooth' });
            }
        });
    });
}

// Обработчики
function setupEventListeners() {
    // Сортировка
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        shopState.sort = e.target.value;
        shopState.page = 1;
        loadProducts();
    });

    // Поиск с задержкой
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            shopState.search = e.target.value;
            shopState.page = 1;
            loadProducts();
        }, 400);
    });
}