document.addEventListener('DOMContentLoaded', async () => {
    await loadCertificates();
});

async function loadCertificates() {
    try {
        const data = await API.get('/certificates');
        if (data.success) {
            renderCertificates(data.certificates);
        }
    } catch (e) {
        console.error('Ошибка загрузки сертификатов:', e);
    }
}

function renderCertificates(certificates) {
    const container = document.getElementById('certificatesGrid');

    if (!certificates || certificates.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-award display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Сертификаты пока не добавлены</h4>
                <p class="text-muted">Документы появятся здесь позже</p>
            </div>`;
        return;
    }

    container.innerHTML = certificates.map(cert => {
        const isImage = cert.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(cert.fileUrl);
        const isPDF = cert.fileUrl && /\.pdf$/i.test(cert.fileUrl);

        return `
        <div class="col-md-6">
            <div class="card cert-card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-flex gap-3">
                        <div class="cert-icon flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center ${isPDF ? 'bg-danger bg-opacity-10' : 'bg-primary bg-opacity-10'}" style="width:80px;height:80px">
                            ${isPDF ? '<i class="bi bi-file-pdf fs-2 text-danger"></i>' : '<i class="bi bi-award fs-2 text-primary"></i>'}
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <h5 class="fw-bold mb-1 text-truncate">${cert.certificateName}</h5>
                            ${cert.certificateDescription ? `<p class="text-muted small mb-2">${cert.certificateDescription.substring(0, 100)}</p>` : ''}
                            ${cert.issueDate ? `<small class="text-muted"><i class="bi bi-calendar-check"></i> Выдан: ${new Date(cert.issueDate).toLocaleDateString('ru-RU')}</small>` : ''}
                        </div>
                    </div>
                    ${cert.fileUrl ? `
                        <div class="d-flex gap-2 mt-3 pt-3 border-top">
                            ${isImage ? `
                                <button class="btn btn-sm btn-outline-primary rounded-pill flex-grow-1 view-cert" data-cert='${JSON.stringify(cert).replace(/'/g, "&#39;")}'>
                                    <i class="bi bi-eye"></i> Просмотреть
                                </button>
                            ` : ''}
                            <a href="${cert.fileUrl}" class="btn btn-sm btn-primary rounded-pill ${isImage ? 'flex-grow-1' : 'w-100'}" download target="_blank">
                                <i class="bi bi-download"></i> Скачать ${isPDF ? 'PDF' : ''}
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    // Обработчики просмотра
    container.querySelectorAll('.view-cert').forEach(btn => {
        btn.addEventListener('click', () => {
            const cert = JSON.parse(btn.dataset.cert.replace(/&#39;/g, "'"));
            openCertificateModal(cert);
        });
    });
}

function openCertificateModal(cert) {
    const modal = new bootstrap.Modal(document.getElementById('certificateModal'));

    document.getElementById('certModalTitle').innerHTML = `<i class="bi bi-award"></i> ${cert.certificateName}`;
    document.getElementById('certModalImage').src = cert.fileUrl;
    document.getElementById('certModalDesc').textContent = cert.certificateDescription || '';
    document.getElementById('certModalDate').textContent = cert.issueDate
        ? `Дата выдачи: ${new Date(cert.issueDate).toLocaleDateString('ru-RU')}`
        : '';
    document.getElementById('certDownloadBtn').href = cert.fileUrl;

    modal.show();
}