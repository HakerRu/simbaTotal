let servicesState = {
    services: [],
    categories: [],
    activeCategory: 'all'
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupFilters();
});

async function loadData() {
    try {
        const [servicesRes, categoriesRes] = await Promise.all([
            API.get('/services'),
            API.get('/services/categories')
        ]);

        if (servicesRes.success) servicesState.services = servicesRes.services;
        if (categoriesRes.success) servicesState.categories = categoriesRes.categories;

        renderCategoryButtons();
        renderServices();
    } catch (e) {
        console.error('Ошибка загрузки:', e);
    }
}

function renderCategoryButtons() {
    const container = document.getElementById('categoryFilter');
    let html = '<button class="btn btn-primary rounded-pill px-4 active" data-category="all">Все услуги</button>';

    servicesState.categories.forEach(cat => {
        html += `<button class="btn btn-outline-primary rounded-pill px-4" data-category="${escapeHtml(cat.categoryId)}">${escapeHtml(cat.categoryName)}</button>`;
    });

    container.innerHTML = html;
}

function setupFilters() {
    document.getElementById('categoryFilter').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#categoryFilter button').forEach(b => {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            e.target.classList.remove('btn-outline-primary');
            e.target.classList.add('btn-primary', 'active');

            servicesState.activeCategory = e.target.dataset.category;
            renderServices();
        }
    });
}

function renderServices() {
    const container = document.getElementById('servicesGrid');
    const filtered = servicesState.activeCategory === 'all'
        ? servicesState.services
        : servicesState.services.filter(s => s.categoryId == servicesState.activeCategory);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Услуг пока нет</h4>
            </div>`;
        return;
    }

    const icons = {
        'терапия': 'bi-heart-pulse',
        'приём': 'bi-clipboard2-pulse',
        'осмотр': 'bi-search-heart',
        'вакцинация': 'bi-shield-check',
        'хирургия': 'bi-scissors',
        'узи': 'bi-soundwave',
        'анализы': 'bi-droplet',
        'стоматология': 'bi-emoji-smile',
        'груминг': 'bi-brush',
        'стационар': 'bi-hospital',
        'default': 'bi-star'
    };

    function getIcon(name) {
        const lower = (name || '').toLowerCase();
        for (const [key, icon] of Object.entries(icons)) {
            if (lower.includes(key)) return icon;
        }
        return icons.default;
    }

    container.innerHTML = filtered.map(service => `
    <div class="col-md-6 col-lg-4">
        <a href="/service.html?id=${service.serviceId}" class="text-decoration-none">
            <div class="card service-detail-card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-flex gap-3 mb-3">
                        <div class="service-icon-circle bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:56px;height:56px">
                            <i class="bi ${getIcon(service.serviceName)} fs-4 text-primary"></i>
                        </div>
                        <div>
                            <h5 class="card-title fw-bold mb-1 text-dark">${escapeHtml(service.serviceName)}</h5>
                            <span class="badge bg-primary bg-opacity-10 text-primary">${escapeHtml(service.categoryName || 'Услуга')}</span>
                        </div>
                    </div>
                    <p class="card-text text-muted small mb-3">${escapeHtml((service.serviceDescription || 'Описание уточняется').substring(0, 120))}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
                        <div>
                            <span class="fw-bold fs-5 text-primary">${Number(service.servicePrice).toLocaleString()} ₽</span>
                        </div>
                        <div class="text-muted small">
                            <i class="bi bi-clock"></i> ${service.durationMinutes} мин
                        </div>
                    </div>
                </div>
            </div>
        </a>
    </div>
`).join('');
}