document.addEventListener('DOMContentLoaded', async () => {
    await loadDoctors();
});

async function loadDoctors() {
    try {
        const data = await API.get('/doctors');
        if (data.success) {
            renderDoctors(data.doctors);
        }
    } catch (e) {
        console.error('Ошибка загрузки врачей:', e);
    }
}

function renderDoctors(doctors) {
    const container = document.getElementById('doctorsGrid');

    if (!doctors || doctors.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-people display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Информация о врачах появится скоро</h4>
            </div>`;
        return;
    }

    container.innerHTML = doctors.map(doc => {
        const fullName = escapeHtml(`${doc.userFirstName || ''} ${doc.userLastName || ''}`.trim());
        const avatarSrc = safeUrl(doc.avatarUrl);
        return `
        <div class="col-md-6 col-lg-4">
            <a href="/doctor.html?id=${encodeURIComponent(doc.userId)}" class="text-decoration-none">
                <div class="card doctor-card border-0 shadow-sm h-100 text-center p-4">
                    <div class="doctor-avatar-wrapper mx-auto mb-3">
                        ${avatarSrc ? `
                            <img src="${avatarSrc}" alt="${fullName}" class="doctor-avatar">
                        ` : `
                            <div class="doctor-avatar bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                                <i class="bi bi-person-fill text-primary fs-1"></i>
                            </div>
                        `}
                    </div>
                    
                    <h5 class="fw-bold mb-1 text-dark">${fullName}</h5>
                    
                    ${doc.doctorSpecialization ? `
                        <span class="badge bg-coral-soft mb-2">${escapeHtml(doc.doctorSpecialization)}</span>
                    ` : ''}
                    
                    ${doc.doctorExperienceYears ? `
                        <p class="text-muted small mb-2">
                            <i class="bi bi-briefcase text-accent"></i> Стаж: ${escapeHtml(doc.doctorExperienceYears)} ${getYearWord(doc.doctorExperienceYears)}
                        </p>
                    ` : ''}
                    
                    ${doc.doctorDescription ? `
                        <p class="text-muted small mb-3">${escapeHtml(doc.doctorDescription.substring(0, 120))}...</p>
                    ` : ''}
                    
                    <div class="mt-auto">
                        <span class="btn btn-accent btn-sm rounded-pill px-3">
                            Смотреть профиль <i class="bi bi-arrow-right"></i>
                        </span>
                    </div>
                </div>
            </a>
        </div>
    `;
    }).join('');
}

function getYearWord(years) {
    const last = years % 10;
    const lastTwo = years % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return 'лет';
    if (last === 1) return 'год';
    if (last >= 2 && last <= 4) return 'года';
    return 'лет';
}