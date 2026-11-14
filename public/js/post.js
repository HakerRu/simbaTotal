document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const fromReels = urlParams.get('from') === 'reels';

    if (!postId) {
        renderErrorState('Публикация не указана', 'Выберите интересный пост или рилс в Инфостенде');
        return;
    }

    await loadPost(postId, { fromReels });
});

function renderErrorState(title, subtitle) {
    document.getElementById('postContent').innerHTML = `
        <div class="ig-detail-article text-center p-5">
            <i class="bi bi-newspaper display-1 text-muted"></i>
            <h4 class="text-navy fw-bold mt-3">${escapeHtml(title)}</h4>
            <p class="text-muted mb-4">${escapeHtml(subtitle)}</p>
            <div class="d-flex justify-content-center gap-2 flex-wrap">
                <a href="/blog.html" class="btn btn-outline-primary rounded-pill px-4"><i class="bi bi-grid-3x3-gap me-1"></i> Главная (Лента)</a>
                <a href="/reels.html" class="btn btn-primary rounded-pill px-4"><i class="bi bi-play-btn me-1"></i> Reels</a>
            </div>
        </div>`;
}

function buildAuthorInfo(post) {
    const author = post.authorFirstName
        ? `${post.authorFirstName} ${post.authorLastName || ''}`.trim()
        : 'ВетКлиника «Симба»';
    const initial = (author[0] || 'С').toUpperCase();
    const dateStr = new Date(post.createDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    return { author, initial, dateStr };
}

function renderAuthorRow(post, { badgeText }) {
    const { author, initial, dateStr } = buildAuthorInfo(post);
    return `
        <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2 min-w-0">
                <div class="ig-ring">
                    <div class="ig-post-avatar">${escapeHtml(initial)}</div>
                </div>
                <div class="min-w-0">
                    <div class="d-flex align-items-center gap-1">
                        <span class="fw-bold text-navy small text-truncate">${escapeHtml(author)}</span>
                        <i class="bi bi-patch-check-fill text-primary" style="font-size:0.85rem"></i>
                    </div>
                    <div class="text-muted" style="font-size:0.75rem">${escapeHtml(dateStr)}</div>
                </div>
            </div>
            <span class="badge bg-cyan-soft rounded-pill px-3 py-2 flex-shrink-0">${badgeText}</span>
        </div>`;
}

function renderDetailMedia(post, { isSplitReel = false } = {}) {
    const media = Array.isArray(post.media) ? post.media.filter(m => m && safeUrl(m.mediaUrl)) : [];
    const postId = Number(post.postId);

    if (media.length === 0) {
        return `
            <div class="ig-text-card-media ${isSplitReel ? 'w-100 h-100 d-flex flex-column justify-content-center' : ''}">
                <span class="badge bg-white bg-opacity-25 rounded-pill mb-3 align-self-start">
                    ${post.postType === 'reel' ? '🎬 Рилс' : '📝 Заметка врача'}
                </span>
                <h2 class="fw-bold mb-2">${escapeHtml(post.postTitle)}</h2>
                <p class="mb-0 opacity-90" style="line-height:1.65">
                    ${escapeHtml((post.postContent || '').substring(0, 260))}${post.postContent && post.postContent.length > 260 ? '...' : ''}
                </p>
            </div>`;
    }

    if (media.length === 1) {
        const m = media[0];
        const src = safeUrl(m.mediaUrl);
        const isVideo = m.mediaType === 'video';
        return `
            <div class="ig-media-stage ${isVideo || isSplitReel ? 'is-video' : ''}" data-post-id="${postId}">
                ${isVideo ? `
                    <video class="ig-media-item" src="${src}" controls playsinline ${isSplitReel ? 'autoplay loop muted' : 'preload="metadata"'}></video>
                ` : `
                    <img class="ig-media-item" src="${src}" alt="${escapeHtml(post.postTitle)}">
                `}
                <div class="ig-heart-burst"><i class="bi bi-heart-fill"></i></div>
            </div>`;
    }

    const carouselId = `detailCarousel-${postId}`;
    const hasOnlyVideo = media.every(m => m.mediaType === 'video');

    return `
        <div class="ig-media-stage ${hasOnlyVideo || isSplitReel ? 'is-video' : ''}" data-post-id="${postId}">
            <span class="ig-carousel-counter" id="counter-${carouselId}">1 / ${media.length}</span>
            <div id="${carouselId}" class="carousel slide" data-bs-ride="false">
                <div class="carousel-indicators mb-2">
                    ${media.map((_, idx) => `
                        <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${idx}" ${idx === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Слайд ${idx + 1}"></button>
                    `).join('')}
                </div>
                <div class="carousel-inner">
                    ${media.map((m, idx) => {
                        const src = safeUrl(m.mediaUrl);
                        return `
                        <div class="carousel-item ${idx === 0 ? 'active' : ''}">
                            ${m.mediaType === 'video' ? `
                                <video class="ig-media-item" src="${src}" controls playsinline preload="metadata"></video>
                            ` : `
                                <img class="ig-media-item" src="${src}" alt="${escapeHtml(post.postTitle)}">
                            `}
                        </div>`;
                    }).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                </button>
            </div>
            <div class="ig-heart-burst"><i class="bi bi-heart-fill"></i></div>
        </div>`;
}

function renderActionBar(post) {
    const postId = Number(post.postId);
    const likesCount = Number(post.likesCount || 0);
    const isLiked = Boolean(post.isLiked);

    return `
        <div class="ig-action-bar">
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="ig-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}" aria-label="Нравится">
                    <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
                    <span class="like-count">${likesCount}</span>
                </button>
                <button type="button" class="ig-action-btn share-btn" data-post-id="${postId}" title="Поделиться" aria-label="Поделиться">
                    <i class="bi bi-send"></i>
                </button>
            </div>
            <div class="d-flex align-items-center gap-3">
                <small class="text-muted"><i class="bi bi-eye me-1"></i>${Number(post.postViews || 0)}</small>
                <a href="/reels.html?id=${postId}" class="btn btn-sm btn-primary rounded-pill px-3">
                    <i class="bi bi-play-btn me-1"></i>В Reels
                </a>
            </div>
        </div>`;
}

async function loadPost(id, { fromReels = false } = {}) {
    const container = document.getElementById('postContent');

    try {
        const data = await API.get('/blog/' + encodeURIComponent(id));
        if (!data.success || !data.post) {
            renderErrorState('Публикация не найдена', 'Возможно, пост был удалён или ещё не опубликован');
            return;
        }

        const p = data.post;
        const postId = Number(p.postId);
        const media = Array.isArray(p.media) ? p.media : [];
        const isReelLayout = p.postType === 'reel' || (media.length > 0 && media[0].mediaType === 'video');

        document.title = `${p.postTitle} | ВетКлиника «Симба» (Нижний Тагил)`;

        // Schema.org BlogPosting / VideoObject microdata
        const existingSchema = document.getElementById('postSchemaJsonLd');
        if (existingSchema) existingSchema.remove();
        const schemaScript = document.createElement('script');
        schemaScript.id = 'postSchemaJsonLd';
        schemaScript.type = 'application/ld+json';
        const authorName = p.authorFirstName ? `${p.authorFirstName} ${p.authorLastName || ''}`.trim() : 'ВетКлиника «Симба»';
        schemaScript.textContent = JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': isReelLayout ? 'VideoObject' : 'BlogPosting',
            'headline': p.postTitle,
            'name': p.postTitle,
            'description': (p.postContent || '').substring(0, 200) || p.postTitle,
            'datePublished': p.createDate,
            'author': {
                '@type': 'Person',
                'name': authorName
            },
            'publisher': {
                '@type': 'VeterinaryCare',
                'name': 'ВетКлиника «Симба»'
            }
        });
        document.head.appendChild(schemaScript);
        const breadcrumbEl = document.getElementById('postBreadcrumb');
        if (breadcrumbEl) {
            breadcrumbEl.textContent = p.postTitle.length > 36 ? `${p.postTitle.slice(0, 36)}...` : p.postTitle;
        }
        const topReelsLink = document.getElementById('topReelsLink');
        if (topReelsLink) {
            topReelsLink.href = `/reels.html?id=${postId}`;
        }

        if (isReelLayout) {
            container.innerHTML = `
                <div class="ig-detail-split">
                    <div class="ig-split-media">
                        ${renderDetailMedia(p, { isSplitReel: true })}
                    </div>
                    <div class="ig-split-side">
                        <div class="ig-post-header border-bottom">
                            <div class="w-100">
                                ${renderAuthorRow(p, { badgeText: '🎬 Рилс' })}
                            </div>
                        </div>
                        <div class="ig-split-scroll">
                            <h1 class="ig-article-title mb-3">${escapeHtml(p.postTitle)}</h1>
                            ${p.postContent ? `
                                <div class="ig-article-content">${escapeHtml(p.postContent)}</div>
                            ` : `
                                <p class="text-muted small mb-0">Короткий видео-совет от специалистов ветклиники «Симба».</p>
                            `}
                        </div>
                        <div class="ig-split-footer">
                            ${renderActionBar(p)}
                            <div class="px-3 pt-1 d-flex gap-2 flex-wrap">
                                <a href="/reels.html?id=${postId}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                                    <i class="bi bi-arrows-fullscreen me-1"></i> Смотреть в плеере Reels
                                </a>
                                <a href="${fromReels ? `/reels.html?id=${postId}` : `/blog.html#post-${postId}`}" class="btn btn-sm btn-light rounded-pill px-3">
                                    <i class="bi bi-arrow-left me-1"></i> ${fromReels ? 'Назад в Reels' : 'В ленту'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>`;
        } else {
            container.innerHTML = `
                <article class="ig-detail-article">
                    <div class="ig-post-header border-bottom">
                        <div class="w-100">
                            ${renderAuthorRow(p, { badgeText: '📝 Статья' })}
                        </div>
                    </div>

                    ${renderDetailMedia(p, { isSplitReel: false })}

                    ${renderActionBar(p)}

                    <div class="p-4 pt-2">
                        <h1 class="ig-article-title mb-3">${escapeHtml(p.postTitle)}</h1>
                        ${p.postContent ? `
                            <div class="ig-article-content mb-4">${escapeHtml(p.postContent)}</div>
                        ` : ''}
                        <div class="d-flex flex-wrap gap-2 pt-3 border-top">
                            <a href="/blog.html#post-${postId}" class="btn btn-outline-primary rounded-pill px-4">
                                <i class="bi bi-grid-3x3-gap me-1"></i> В ленту Инфостенда
                            </a>
                            <a href="/reels.html?id=${postId}" class="btn btn-primary rounded-pill px-4">
                                <i class="bi bi-play-btn me-1"></i> Открыть в Reels
                            </a>
                        </div>
                    </div>
                </article>`;
        }

        bindDetailEvents();
        loadRelatedPosts(p.postId);
    } catch (e) {
        renderErrorState('Ошибка загрузки', 'Попробуйте обновить страницу чуть позже');
    }
}

function bindDetailEvents() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLikeToggle(btn.dataset.postId, btn));
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => shareCurrentPost(btn.dataset.postId));
    });

    document.querySelectorAll('.ig-media-stage').forEach(stage => {
        stage.addEventListener('dblclick', () => {
            const burst = stage.querySelector('.ig-heart-burst');
            if (burst) {
                burst.classList.add('show');
                setTimeout(() => burst.classList.remove('show'), 650);
            }
            const likeBtn = document.querySelector(`.like-btn[data-post-id="${stage.dataset.postId}"]`);
            if (likeBtn && !likeBtn.classList.contains('liked')) {
                handleLikeToggle(stage.dataset.postId, likeBtn);
            }
        });
    });

    document.querySelectorAll('.carousel').forEach(carouselEl => {
        const counterEl = document.getElementById(`counter-${carouselEl.id}`);
        if (!counterEl) return;
        const total = carouselEl.querySelectorAll('.carousel-item').length;
        carouselEl.addEventListener('slid.bs.carousel', (e) => {
            counterEl.textContent = `${e.to + 1} / ${total}`;
        });
    });
}

async function handleLikeToggle(postId, btn) {
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('.like-count');
    const wasLiked = btn.classList.contains('liked');
    const prevCount = parseInt(countEl.textContent, 10) || 0;

    btn.classList.toggle('liked', !wasLiked);
    icon.classList.toggle('bi-heart-fill', !wasLiked);
    icon.classList.toggle('bi-heart', wasLiked);
    countEl.textContent = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    try {
        const data = await API.post(`/blog/${postId}/like`);
        if (data.success) {
            countEl.textContent = data.count;
            btn.classList.toggle('liked', Boolean(data.liked));
            icon.classList.toggle('bi-heart-fill', Boolean(data.liked));
            icon.classList.toggle('bi-heart', !data.liked);
        }
    } catch (e) {
        btn.classList.toggle('liked', wasLiked);
        icon.classList.toggle('bi-heart-fill', wasLiked);
        icon.classList.toggle('bi-heart', !wasLiked);
        countEl.textContent = prevCount;
    }
}

function shareCurrentPost(postId) {
    const url = `${window.location.origin}/post.html?id=${postId}`;
    if (navigator.share) {
        navigator.share({ title: document.title, url }).catch(() => {});
        return;
    }
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof showToast === 'function') {
                showToast('Ссылка на публикацию скопирована!');
            } else {
                alert('Ссылка на публикацию скопирована!');
            }
        }).catch(() => {});
    }
}

async function loadRelatedPosts(currentPostId) {
    try {
        const data = await API.get('/blog?limit=4');
        if (!data.success || !Array.isArray(data.posts)) return;

        const others = data.posts.filter(item => String(item.postId) !== String(currentPostId)).slice(0, 3);
        if (others.length === 0) return;

        const grid = document.getElementById('relatedPostsGrid');
        const section = document.getElementById('relatedPostsSection');

        grid.innerHTML = others.map(item => {
            const media = Array.isArray(item.media) && item.media[0] ? item.media[0] : null;
            const src = media ? safeUrl(media.mediaUrl) : '';
            const isVideo = media && media.mediaType === 'video';
            const isReel = item.postType === 'reel';

            return `
                <div class="col-md-4">
                    <a href="/post.html?id=${Number(item.postId)}" class="text-decoration-none">
                        <div class="ig-related-card shadow-sm h-100 d-flex flex-column">
                            <div class="position-relative" style="height:170px;background:#f4f7fc">
                                ${src && !isVideo ? `
                                    <img src="${src}" class="w-100 h-100" style="object-fit:cover" alt="${escapeHtml(item.postTitle)}" loading="lazy">
                                ` : src && isVideo ? `
                                    <video src="${src}" class="w-100 h-100" style="object-fit:cover;background:#0b1220" muted preload="metadata"></video>
                                ` : `
                                    <div class="w-100 h-100 bg-cyan-soft d-flex align-items-center justify-content-center">
                                        <i class="bi bi-newspaper text-primary fs-1"></i>
                                    </div>
                                `}
                                <span class="badge bg-dark bg-opacity-75 rounded-pill position-absolute top-0 end-0 m-2">
                                    ${isReel ? '<i class="bi bi-play-fill"></i> Reels' : 'Статья'}
                                </span>
                            </div>
                            <div class="p-3 d-flex flex-column flex-grow-1">
                                <h6 class="fw-bold text-navy mb-2">${escapeHtml(item.postTitle)}</h6>
                                <div class="mt-auto d-flex justify-content-between text-muted small">
                                    <span><i class="bi bi-heart"></i> ${Number(item.likesCount || 0)}</span>
                                    <span><i class="bi bi-eye"></i> ${Number(item.postViews || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>`;
        }).join('');

        section.classList.remove('d-none');
    } catch (e) {}
}
