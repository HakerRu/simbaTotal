document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('id');

    if (!doctorId) {
        document.getElementById('doctorContent').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-person-x display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Врач не указан</h4>
                <a href="/doctors.html" class="btn btn-primary rounded-pill px-4 mt-2">Все врачи</a>
            </div>`;
        return;
    }

    await loadDoctor(doctorId);
});

async function loadDoctor(id) {
    const container = document.getElementById('doctorContent');

    try {
        const data = await API.get('/doctors/' + id);

        if (!data.success || !data.doctor) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-person-x display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Врач не найден</h4>
                    <a href="/doctors.html" class="btn btn-primary rounded-pill px-4 mt-2">Все врачи</a>
                </div>`;
            return;
        }

        const d = data.doctor;
        const fullName = `${d.userFirstName} ${d.userLastName}`;

        container.innerHTML = `
            <div class="row g-4 g-lg-5">
                <div class="col-lg-5">
                    <div class="doctor-profile-photo position-relative">
                        ${d.avatarUrl ? `
                            <img src="${d.avatarUrl}" alt="${fullName}" class="img-fluid rounded-4 shadow w-100">
                        ` : `
                            <div class="bg-light rounded-4 d-flex align-items-center justify-content-center shadow" style="aspect-ratio:3/4">
                                <i class="bi bi-person-fill text-muted" style="font-size:8rem"></i>
                            </div>
                        `}
                        ${d.doctorStatusText ? `
                            <span class="badge bg-dark bg-opacity-75 position-absolute bottom-0 start-0 m-3 px-3 py-2 rounded-pill">
                                <i class="bi bi-circle-fill text-success small"></i> ${d.doctorStatusText}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="col-lg-7">
                    <span class="text-primary fw-semibold small text-uppercase">Врач клиники</span>
                    <h1 class="fw-bold mb-2">${fullName}</h1>
                    ${d.doctorSpecialization ? `
                        <p class="text-muted text-uppercase small mb-3">${d.doctorSpecialization}</p>
                    ` : ''}

                    ${d.doctorDescription ? `
                        <h6 class="fw-bold mt-4 mb-2">О враче</h6>
                        <p class="text-muted">${d.doctorDescription}</p>
                    ` : ''}

                    ${d.doctorExperienceYears ? `
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <i class="bi bi-briefcase text-primary"></i>
                            <span>Стаж: <strong>${d.doctorExperienceYears} ${getYearWord(d.doctorExperienceYears)}</strong></span>
                        </div>
                    ` : ''}

                    ${d.doctorEducation ? `
                        <div class="d-flex align-items-start gap-2 mb-2">
                            <i class="bi bi-mortarboard text-primary mt-1"></i>
                            <span>${d.doctorEducation}</span>
                        </div>
                    ` : ''}

                    ${d.doctorServices ? `
                        <div class="d-flex align-items-start gap-2 mb-2">
                            <i class="bi bi-heart-pulse text-primary mt-1"></i>
                            <span>${d.doctorServices}</span>
                        </div>
                    ` : ''}

                    <div class="d-flex flex-wrap gap-2 mt-4">
                        ${d.vkLink ? `<a href="${d.vkLink}" target="_blank" class="btn btn-outline-primary rounded-pill px-3"><i class="bi bi-vk"></i> VK</a>` : ''}
                        ${d.telegramLink ? `<a href="${d.telegramLink}" target="_blank" class="btn btn-outline-info rounded-pill px-3"><i class="bi bi-telegram"></i> Telegram</a>` : ''}
                        ${d.doctorInstagram ? `<a href="${d.doctorInstagram}" target="_blank" class="btn btn-outline-danger rounded-pill px-3"><i class="bi bi-instagram"></i> Instagram</a>` : ''}
                        ${d.doctorWhatsapp ? `<a href="${d.doctorWhatsapp}" target="_blank" class="btn btn-outline-success rounded-pill px-3"><i class="bi bi-whatsapp"></i> WhatsApp</a>` : ''}
                    </div>

                    <div class="mt-4">
                        <a href="/schedule.html?doctor=${d.userId}" class="btn btn-primary rounded-pill px-4 fw-semibold">
                            <i class="bi bi-calendar-check"></i> Смотреть расписание
                        </a>
                    </div>
                </div>
            </div>

            ${(d.doctorCertificatesList || d.doctorPortfolio) ? `
                <div class="row g-4 mt-5">
                    ${d.doctorCertificatesList ? `
                        <div class="col-md-6">
                            <div class="card border-0 shadow-sm rounded-4 h-100">
                                <div class="card-body p-4">
                                    <h5 class="fw-bold mb-3"><i class="bi bi-award text-primary"></i> Образование и сертификаты</h5>
                                    <div class="text-muted small" style="white-space:pre-line">${d.doctorCertificatesList}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    ${d.doctorPortfolio ? `
                        <div class="col-md-6">
                            <div class="card border-0 shadow-sm rounded-4 h-100">
                                <div class="card-body p-4">
                                    <h5 class="fw-bold mb-3"><i class="bi bi-briefcase text-primary"></i> Опыт и портфолио</h5>
                                    <div class="text-muted small" style="white-space:pre-line">${d.doctorPortfolio}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    } catch (e) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h4 class="text-muted mt-3">Ошибка загрузки</h4>
                <a href="/doctors.html" class="btn btn-primary rounded-pill px-4 mt-2">Все врачи</a>
            </div>`;
    }
}

function getYearWord(years) {
    const last = years % 10;
    const lastTwo = years % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return 'лет';
    if (last === 1) return 'год';
    if (last >= 2 && last <= 4) return 'года';
    return 'лет';
}