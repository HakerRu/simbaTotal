document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');

    if (!serviceId) {
        document.getElementById('serviceContent').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-clipboard-x display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Услуга не указана</h4>
                <a href="/services.html" class="btn btn-primary rounded-pill px-4 mt-2">Все услуги</a>
            </div>`;
        return;
    }

    await loadService(serviceId);
});

async function loadService(id) {
    const container = document.getElementById('serviceContent');

    try {
        const data = await API.get('/services/' + id);

        if (!data.success || !data.service) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-clipboard-x display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Услуга не найдена</h4>
                    <a href="/services.html" class="btn btn-primary rounded-pill px-4 mt-2">Все услуги</a>
                </div>`;
            return;
        }

        const s = data.service;

        container.innerHTML = `
            <div class="row g-4 g-lg-5">
                <div class="col-lg-7">
                    <span class="badge bg-primary bg-opacity-10 text-primary mb-2 px-3 py-2 rounded-pill">
                        ${s.categoryName || 'Услуга'}
                    </span>
                    <h1 class="fw-bold mb-3">${s.serviceName}</h1>
                    
                    ${s.serviceDescription ? `
                        <p class="text-muted mb-4" style="white-space:pre-line">${s.serviceDescription}</p>
                    ` : ''}

                    <div class="row g-3 mb-4">
                        <div class="col-sm-6">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-clock text-primary fs-4"></i>
                                <div>
                                    <small class="text-muted d-block">Длительность</small>
                                    <strong>${s.durationMinutes} мин</strong>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-currency-exchange text-primary fs-4"></i>
                                <div>
                                    <small class="text-muted d-block">Стоимость</small>
                                    <strong class="text-primary fs-5">${Number(s.servicePrice).toLocaleString()} ₽</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-2">
                        <a href="/schedule.html" class="btn btn-primary rounded-pill px-4 fw-semibold">
                            <i class="bi bi-calendar-check"></i> Записаться на приём
                        </a>
                        <a href="tel:+79991234567" class="btn btn-outline-primary rounded-pill px-4">
                            <i class="bi bi-telephone"></i> Позвонить
                        </a>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="card border-0 shadow-sm rounded-4">
                        <div class="card-body p-4">
                            <h5 class="fw-bold mb-3"><i class="bi bi-info-circle text-primary"></i> Информация</h5>
                            <ul class="list-unstyled small mb-0">
                                <li class="mb-2 d-flex justify-content-between">
                                    <span class="text-muted">Категория:</span>
                                    <span>${s.categoryName || '—'}</span>
                                </li>
                                <li class="mb-2 d-flex justify-content-between">
                                    <span class="text-muted">Длительность:</span>
                                    <span>${s.durationMinutes} мин</span>
                                </li>
                                <li class="mb-2 d-flex justify-content-between">
                                    <span class="text-muted">Цена:</span>
                                    <span class="fw-bold text-primary">${Number(s.servicePrice).toLocaleString()} ₽</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h4 class="text-muted mt-3">Ошибка загрузки</h4>
                <a href="/services.html" class="btn btn-primary rounded-pill px-4 mt-2">Все услуги</a>
            </div>`;
    }
}