const feedState = {
    posts: [],
    activeType: 'all',
    page: 1,
    perPage: 10,
    total: 0,
    loading: false
};

document.addEventListener('DOMContentLoaded', async () => {
    setupFilters();
    setupLoadMore();
    await loadPosts({ append: false });
});

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline-primary');

            feedState.activeType = btn.dataset.type;
            feedState.page = 1;
            loadPosts({ append: false });
        });
    });
}

function setupLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;

    loadMoreBtn.addEventListener('click', () => {
        if (feedState.loading) return;
        feedState.page += 1;
        loadPosts({ append: true });
    });
}

async function loadPosts({ append = false } = {}) {
    if (feedState.loading) return;
    feedState.loading = true;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (append && loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Загрузка...';
    }

    try {
        const params = new URLSearchParams({
            type: feedState.activeType,
            page: feedState.page,
            limit: feedState.perPage
        });

        const data = await API.get(`/blog?${params}`);
        if (data.success) {
            feedState.total = Number(data.total || 0);
            feedState.posts = append ? [...feedState.posts, ...data.posts] : data.posts;

            const countEl = document.getElementById('totalPostsCount');
            if (countEl && feedState.activeType === 'all') {
                countEl.textContent = feedState.total;
            }

            renderFeed();
            updateLoadMoreVisibility();

            if (!append && window.location.hash.startsWith('#post-')) {
                const target = document.getElementById(window.location.hash.slice(1));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки ленты:', e);
        if (!append) {
            document.getElementById('postsFeed').innerHTML = `
                <div class="ig-post-card text-center p-5">
                    <i class="bi bi-exclamation-triangle display-4 text-danger"></i>
                    <h5 class="mt-3 text-muted">Не удалось загрузить ленту</h5>
                </div>`;
        }
    } finally {
        feedState.loading = false;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="bi bi-arrow-down-circle me-1"></i> Загрузить ещё посты';
        }
    }
}

function updateLoadMoreVisibility() {
    const wrap = document.getElementById('loadMoreWrap');
    if (!wrap) return;
    wrap.style.display = feedState.posts.length < feedState.total ? 'block' : 'none';
}

function renderMediaStage(post) {
    const media = Array.isArray(post.media) ? post.media.filter(m => m && safeUrl(m.mediaUrl)) : [];
    const postId = Number(post.postId);

    if (media.length === 0) {
        return `
            <div class="ig-text-card-media">
                <span class="badge bg-white bg-opacity-25 rounded-pill mb-2">
                    ${post.postType === 'reel' ? '🎬 Рилс' : '📝 Заметка врача'}
                </span>
                <h4 class="fw-bold mb-2">${escapeHtml(post.postTitle)}</h4>
                <p class="mb-0 opacity-90" style="line-height:1.6">
                    ${escapeHtml((post.postContent || '').substring(0, 220))}${post.postContent && post.postContent.length > 220 ? '...' : ''}
                </p>
            </div>`;
    }

    if (media.length === 1) {
        const m = media[0];
        const src = safeUrl(m.mediaUrl);
        const isVideo = m.mediaType === 'video';
        return `
            <div class="ig-media-stage ${isVideo ? 'is-video' : ''}" data-post-id="${postId}">
                ${isVideo ? `
                    <video class="ig-media-item" src="${src}" controls playsinline preload="metadata"></video>
                ` : `
                    <img class="ig-media-item" src="${src}" alt="${escapeHtml(post.postTitle)}" loading="lazy">
                `}
                <div class="ig-heart-burst"><i class="bi bi-heart-fill"></i></div>
            </div>`;
    }

    const carouselId = `igCarousel-${postId}`;
    const hasOnlyVideo = media.every(m => m.mediaType === 'video');

    return `
        <div class="ig-media-stage ${hasOnlyVideo ? 'is-video' : ''}" data-post-id="${postId}">
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
                                <img class="ig-media-item" src="${src}" alt="${escapeHtml(post.postTitle)}" loading="lazy">
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

function renderFeed() {
    const container = document.getElementById('postsFeed');

    if (feedState.posts.length === 0) {
        container.innerHTML = `
            <div class="ig-post-card text-center p-5">
                <i class="bi bi-camera display-3 text-muted"></i>
                <h4 class="text-muted mt-3">Публикаций пока нет</h4>
                <p class="text-muted mb-0">Скоро врачи «Симбы» добавят новые посты и рилсы</p>
            </div>`;
        return;
    }

    container.innerHTML = feedState.posts.map(post => {
        const postId = Number(post.postId);
        const isReel = post.postType === 'reel';
        const author = post.authorFirstName
            ? `${post.authorFirstName} ${post.authorLastName || ''}`.trim()
            : 'ВетКлиника «Симба»';
        const initial = (author[0] || 'С').toUpperCase();
        const dateStr = new Date(post.createDate).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const content = (post.postContent || '').trim();
        const isLong = content.length > 180;
        const likesCount = Number(post.likesCount || 0);
        const isLiked = Boolean(post.isLiked);

        return `
        <article class="ig-post-card" id="post-${postId}">
            <div class="ig-post-header">
                <div class="d-flex align-items-center gap-2 min-w-0">
                    <div class="ig-ring">
                        <div class="ig-post-avatar">${escapeHtml(initial)}</div>
                    </div>
                    <div class="min-w-0">
                        <div class="fw-bold text-navy small text-truncate">${escapeHtml(author)}</div>
                        <div class="text-muted" style="font-size:0.75rem">${escapeHtml(dateStr)}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <a href="/reels.html?id=${postId}" class="btn btn-sm ${isReel ? 'btn-accent' : 'btn-outline-primary'} rounded-pill px-3" title="Открыть в режиме Reels">
                        <i class="bi bi-play-btn me-1"></i>Reels
                    </a>
                </div>
            </div>

            ${renderMediaStage(post)}

            <div class="ig-action-bar">
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="ig-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}" aria-label="Нравится">
                        <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
                        <span class="like-count">${likesCount}</span>
                    </button>
                    <a href="/post.html?id=${postId}" class="ig-action-btn" title="Открыть пост полностью" aria-label="Открыть пост">
                        <i class="bi bi-chat-square-text"></i>
                    </a>
                    <button type="button" class="ig-action-btn share-btn" data-post-id="${postId}" title="Поделиться" aria-label="Поделиться">
                        <i class="bi bi-send"></i>
                    </button>
                </div>
                <small class="text-muted"><i class="bi bi-eye me-1"></i>${Number(post.postViews || 0)}</small>
            </div>

            <div class="ig-post-body">
                <h2 class="h6 fw-bold text-navy mb-1">
                    <a href="/post.html?id=${postId}" class="text-decoration-none text-navy">${escapeHtml(post.postTitle)}</a>
                </h2>
                ${content ? `
                    <div class="ig-caption">
                        <span class="caption-short">${escapeHtml(isLong ? content.slice(0, 180) + '...' : content)}</span>${isLong ? `<span class="caption-full d-none">${escapeHtml(content)}</span> <button type="button" class="btn btn-link btn-sm p-0 align-baseline text-decoration-none toggle-caption-btn">ещё</button>` : ''}
                    </div>
                ` : ''}
                <div class="mt-2">
                    <a href="/post.html?id=${postId}" class="small fw-semibold text-accent text-decoration-none">
                        Открыть полностью <i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </div>
        </article>`;
    }).join('');

    bindFeedEvents();
}

function bindFeedEvents() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLikeToggle(btn.dataset.postId, btn));
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => sharePost(btn.dataset.postId));
    });

    document.querySelectorAll('.toggle-caption-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const caption = btn.closest('.ig-caption');
            caption.querySelector('.caption-short')?.classList.add('d-none');
            caption.querySelector('.caption-full')?.classList.remove('d-none');
            btn.remove();
        });
    });

    document.querySelectorAll('.ig-media-stage').forEach(stage => {
        stage.addEventListener('dblclick', () => {
            const postId = stage.dataset.postId;
            const burst = stage.querySelector('.ig-heart-burst');
            if (burst) {
                burst.classList.add('show');
                setTimeout(() => burst.classList.remove('show'), 650);
            }
            const card = stage.closest('.ig-post-card');
            const likeBtn = card?.querySelector('.like-btn');
            if (likeBtn && !likeBtn.classList.contains('liked')) {
                handleLikeToggle(postId, likeBtn);
            }
        });
    });

    document.querySelectorAll('.ig-media-stage .carousel').forEach(carouselEl => {
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

function sharePost(postId) {
    const url = `${window.location.origin}/post.html?id=${postId}`;
    if (navigator.share) {
        navigator.share({ title: 'ВетКлиника «Симба» — Инфостенд', url }).catch(() => {});
        return;
    }
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof showToast === 'function') {
                showToast('Ссылка на пост скопирована!');
            } else {
                alert('Ссылка на пост скопирована!');
            }
        }).catch(() => {});
    }
}
