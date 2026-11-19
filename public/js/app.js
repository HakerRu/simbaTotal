// Основной JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('🐾 Симба — сайт загружен!');

    checkAuth();
    updateCartCount();
    highlightCurrentPage();

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('mainNav');
        if (nav) nav.classList.toggle('navbar-scrolled', window.scrollY > 24);
    }, { passive: true });
});

// Проверка авторизации
async function checkAuth() {
    try {
        const data = await API.get('/auth/me');
        if (data.success) {
            updateUserMenu(data.user);
        }
    } catch (error) {
        updateUserMenu(null);
    }
}

// Обновление меню пользователя в шапке
function updateUserMenu(user) {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    if (user) {
        userMenu.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-nav-auth btn-sm rounded-pill px-3 dropdown-toggle" 
                        type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle"></i> ${escapeHtml(user.userFirstName)}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/profile.html">
                        <i class="bi bi-person"></i> Личный кабинет
                    </a></li>
                    ${user.role === 'admin' || user.role === 'manager' ? `
                        <li><a class="dropdown-item" href="/admin.html">
                            <i class="bi bi-gear"></i> Админ-панель
                        </a></li>
                    ` : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()">
                        <i class="bi bi-box-arrow-right"></i> Выйти
                    </a></li>
                </ul>
            </div>
        `;
    } else {
        userMenu.innerHTML = `
            <a class="btn btn-nav-auth btn-sm rounded-pill px-3" href="/login.html">
                <i class="bi bi-person"></i> Войти
            </a>
        `;
    }
}

// Выход
async function logout() {
    try {
        await API.post('/auth/logout');
        window.location.href = '/';
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Счётчик корзины
async function updateCartCount() {
    try {
        const data = await API.get('/shop/cart/count');
        document.querySelectorAll('.cart-count').forEach(badge => {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
    } catch (error) {
        // не авторизован
    }
}

// Активная ссылка в шапке
function highlightCurrentPage() {
    const path = window.location.pathname || '/';
    const sectionMap = {
        '/': '/',
        '/index.html': '/',
        '/shop.html': '/shop.html',
        '/product.html': '/shop.html',
        '/cart.html': '/shop.html',
        '/checkout.html': '/shop.html',
        '/services.html': '/services.html',
        '/service.html': '/services.html',
        '/reels.html': '/reels.html',
        '/blog.html': '/reels.html',
        '/post.html': '/reels.html',
        '/doctors.html': '/doctors.html',
        '/doctor.html': '/doctors.html',
        '/gallery.html': '/gallery.html',
        '/certificates.html': '/certificates.html',
        '/contacts.html': '/contacts.html'
    };

    const target = sectionMap[path];
    if (!target) return;

    document.querySelectorAll('#mainNav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === target) {
            link.classList.add('active');
        }
    });

    document.querySelectorAll('#mainNav .dropdown-item').forEach(item => {
        const match = item.getAttribute('href') === target;
        item.classList.toggle('active', match);
        if (match) {
            const parentToggle = item.closest('.dropdown')?.querySelector('.nav-link');
            if (parentToggle) parentToggle.classList.add('active');
        }
    });
}

// Toast уведомления
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"></div>
            <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toast.querySelector('.toast-body').textContent = message;

    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}
