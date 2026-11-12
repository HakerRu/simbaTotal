document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        document.getElementById('postContent').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-newspaper display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Пост не указан</h4>
                <a href="/blog.html" class="btn btn-primary rounded-pill px-4 mt-2">Все посты</a>
            </div>`;
        return;
    }

    await loadPost(postId);
});

async function loadPost(id) {
    const container = document.getElementById('postContent');

    try {
        const data = await API.get('/blog/' + id);

        if (!data.success || !data.post) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-newspaper display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">Пост не найден</h4>
                    <a href="/blog.html" class="btn btn-primary rounded-pill px-4 mt-2">Все посты</a>
                </div>`;
            return;
        }

        const p = data.post;
        const isReel = p.postType === 'reel';
        const media = p.media || [];

        container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="mb-3">
                        <span class="badge bg-primary bg-opacity-10 text-primary">${isReel ? '🎬 Рилс' : '📝 Статья'}</span>
                        <span class="badge bg-light text-muted ms-2">
                            <i class="bi bi-calendar"></i> ${new Date(p.createDate).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'})}
                        </span>
                        <span class="badge bg-light text-muted ms-2">
                            <i class="bi bi-eye"></i> ${p.postViews || 0}
                        </span>
                    </div>
                    
                    <h1 class="fw-bold mb-4">${escapeHtml(p.postTitle)}</h1>
                    
                    ${media.length > 0 ? `
                        <div id="postCarousel" class="carousel slide mb-4 rounded-4 overflow-hidden" data-bs-ride="carousel">
                            ${media.length > 1 ? `
                                <div class="carousel-indicators">
                                    ${media.map((_, i) => `
                                        <button type="button" data-bs-target="#postCarousel" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ''}></button>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div class="carousel-inner">
                                ${media.map((m, i) => `
                                    <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                        ${m.mediaType === 'video' ? `
                                            <video src="${safeUrl(m.mediaUrl)}" class="d-block w-100" controls style="max-height:600px;object-fit:contain;background:#000"></video>
                                        ` : `
                                            <img src="${safeUrl(m.mediaUrl)}" class="d-block w-100" style="max-height:600px;object-fit:contain;background:#f5f9ff">
                                        `}
                                    </div>
                                `).join('')}
                            </div>
                            ${media.length > 1 ? `
                                <button class="carousel-control-prev" type="button" data-bs-target="#postCarousel" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon"></span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#postCarousel" data-bs-slide="next">
                                    <span class="carousel-control-next-icon"></span>
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="post-content" style="white-space:pre-line;line-height:1.8;font-size:1.05rem">
                        ${escapeHtml(p.postContent || '')}
                    </div>
                    
                    ${p.authorFirstName ? `
                        <div class="mt-5 pt-4 border-top">
                            <small class="text-muted">Автор:</small>
                            <strong>${escapeHtml(p.authorFirstName)} ${escapeHtml(p.authorLastName || '')}</strong>
                        </div>
                    ` : ''}
                    
                    <div class="mt-4 d-flex flex-wrap gap-2">
                        <a href="/blog.html#post-${Number(p.postId)}" class="btn btn-outline-primary rounded-pill px-4">
                            <i class="bi bi-grid-3x3-gap me-1"></i> В ленту
                        </a>
                        <a href="/reels.html?id=${Number(p.postId)}" class="btn btn-primary rounded-pill px-4">
                            <i class="bi bi-play-btn me-1"></i> Смотреть в Reels
                        </a>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h4 class="text-muted mt-3">Ошибка загрузки</h4>
                <a href="/blog.html" class="btn btn-primary rounded-pill px-4 mt-2">Все посты</a>
            </div>`;
    }
}