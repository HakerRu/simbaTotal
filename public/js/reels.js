let reels = [];
let currentType = 'all';
let observer = null;
let pendingTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    pendingTargetId = urlParams.get('id');
    const typeParam = urlParams.get('type');
    if (typeParam && ['all', 'article', 'reel'].includes(typeParam)) {
        currentType = typeParam;
        document.querySelectorAll('#reelsFilters button').forEach(b => {
            b.classList.toggle('active', b.dataset.type === currentType);
        });
    }

    setupFilters();
    await loadReels();
});

function setupFilters() {
    document.querySelectorAll('#reelsFilters button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#reelsFilters button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            loadReels();
        });
    });
}

async function loadReels() {
    const container = document.getElementById('reelsContainer');

    if (observer) observer.disconnect();

    container.innerHTML = `
        <div class="reels-empty">
            <div>
                <div class="spinner-border text-light" role="status"></div>
                <p class="mt-3">Загрузка...</p>
            </div>
        </div>`;

    try {
        const params = new URLSearchParams({ limit: 50 });
        if (currentType !== 'all') params.append('type', currentType);

        const data = await API.get(`/blog?${params}`);

        if (!data.success || data.posts.length === 0) {
            container.innerHTML = `
                <div class="reels-empty">
                    <div>
                        <i class="bi bi-newspaper" style="font-size:4rem;opacity:0.5"></i>
                        <h4 class="mt-3">Постов пока нет</h4>
                        <p class="opacity-75">Загляните позже</p>
                    </div>
                </div>`;
            return;
        }

        reels = data.posts;

        if (pendingTargetId && !reels.some(p => String(p.postId) === String(pendingTargetId))) {
            try {
                const single = await API.get('/blog/' + encodeURIComponent(pendingTargetId));
                if (single.success && single.post) {
                    reels.unshift(single.post);
                }
            } catch (e) {}
        }

        renderReels();
        setupObserver();

        if (pendingTargetId) {
            const targetEl = container.querySelector(`.reel-item[data-id="${CSS.escape(String(pendingTargetId))}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'auto' });
            } else {
                container.scrollTop = 0;
            }
            pendingTargetId = null;
        } else {
            container.scrollTop = 0;
        }
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        container.innerHTML = `
            <div class="reels-empty">
                <div>
                    <i class="bi bi-exclamation-triangle" style="font-size:4rem;opacity:0.5"></i>
                    <h4 class="mt-3">Ошибка загрузки</h4>
                </div>
            </div>`;
    }
}

function renderReels() {
    const container = document.getElementById('reelsContainer');

    container.innerHTML = reels.map((post, index) => {
        const firstMedia = post.media && post.media[0] ? post.media[0] : null;
        const mediaSrc = firstMedia ? safeUrl(firstMedia.mediaUrl) : '';
        const isVideo = firstMedia && firstMedia.mediaType === 'video' && mediaSrc;
        const isImage = firstMedia && firstMedia.mediaType === 'image' && mediaSrc;
        const isArticle = post.postType === 'article';
        const author = post.authorFirstName ? `${post.authorFirstName} ${post.authorLastName || ''}`.trim() : 'ВетКлиника Симба';
        const safeAuthor = escapeHtml(author);
        const safeTitle = escapeHtml(post.postTitle);
        const likesCount = post.likesCount || 0;
        const isLiked = post.isLiked || false;

        return `
        <div class="reel-item" data-index="${index}" data-id="${escapeHtml(post.postId)}">
            <div class="reel-frame">
                ${isVideo ? `
                    <video class="reel-video" src="${mediaSrc}" loop playsinline preload="metadata" muted></video>
                ` : isImage ? `
                    <img class="reel-image" src="${mediaSrc}" alt="${safeTitle}">
                ` : `
                    <div class="reel-text-only">
                        <div class="reel-type-badge">${isArticle ? '📝 Статья' : '🎬 Рилс'}</div>
                        <h2>${safeTitle}</h2>
                        <p>${escapeHtml((post.postContent || '').substring(0, 300))}${post.postContent && post.postContent.length > 300 ? '...' : ''}</p>
                    </div>
                `}

                <div class="reel-actions">
                    <div class="text-center">
                        <button class="reel-action" onclick="toggleLike(${Number(post.postId)}, this)" title="Нравится">
                            <i class="bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>
                        </button>
                        <div class="reel-action-count">${likesCount}</div>
                    </div>
                    <div class="text-center">
                        <button class="reel-action" onclick="openPost(${Number(post.postId)})" title="Открыть статью полностью">
                            <i class="bi bi-file-text"></i>
                        </button>
                        <div class="reel-action-count">${post.postViews || 0}</div>
                    </div>
                    <div class="text-center">
                        <a href="/blog.html#post-${Number(post.postId)}" class="reel-action text-decoration-none" title="Открыть в ленте">
                            <i class="bi bi-grid-3x3-gap"></i>
                        </a>
                    </div>
                    <div class="text-center">
                        <button class="reel-action" onclick="shareReel(${Number(post.postId)})" title="Поделиться">
                            <i class="bi bi-send"></i>
                        </button>
                    </div>
                    ${isVideo ? `
                        <div class="text-center">
                            <button class="reel-action" onclick="toggleSound(this)" title="Звук">
                                <i class="bi bi-volume-mute"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <div class="reel-overlay">
                    <div class="reel-author">
                        <div class="reel-author-avatar">${escapeHtml(author[0] || 'С')}</div>
                        <div>
                            <div style="font-weight:600;font-size:0.9rem">${safeAuthor}</div>
                            <div style="font-size:0.75rem;opacity:0.75">${new Date(post.createDate).toLocaleDateString('ru-RU')}</div>
                        </div>
                    </div>
                    <div class="reel-title" style="cursor:pointer" onclick="openPost(${Number(post.postId)})">${safeTitle}</div>
                    <p class="reel-desc">${escapeHtml((post.postContent || '').substring(0, 100))}${post.postContent && post.postContent.length > 100 ? '...' : ''}</p>
                    <button type="button" class="btn btn-sm btn-light rounded-pill px-3 mt-2 fw-semibold" style="font-size:0.76rem" onclick="openPost(${Number(post.postId)})">
                        Читать полностью <i class="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function setupObserver() {
    const videos = document.querySelectorAll('.reel-video');

    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (video.tagName !== 'VIDEO') return;

            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, { threshold: 0.6 });

    videos.forEach(video => observer.observe(video));
}

function toggleSound(btn) {
    const reelItem = btn.closest('.reel-item');
    const video = reelItem.querySelector('video');
    if (!video) return;

    video.muted = !video.muted;
    const icon = btn.querySelector('i');

    if (video.muted) {
        icon.classList.remove('bi-volume-up');
        icon.classList.add('bi-volume-mute');
    } else {
        icon.classList.remove('bi-volume-mute');
        icon.classList.add('bi-volume-up');
    }
}

async function toggleLike(postId, btn) {
    const icon = btn.querySelector('i');
    const countEl = btn.parentElement.querySelector('.reel-action-count');
    const wasLiked = icon.classList.contains('bi-heart-fill');

    // Оптимистичное обновление
    if (wasLiked) {
        icon.classList.remove('bi-heart-fill', 'text-danger');
        icon.classList.add('bi-heart');
        countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    } else {
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill', 'text-danger');
        countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
    }

    try {
        const data = await API.post(`/blog/${postId}/like`);
        if (data.success) {
            countEl.textContent = data.count;
        }
    } catch (e) {
        // Откат при ошибке
        if (wasLiked) {
            icon.classList.add('bi-heart-fill', 'text-danger');
            icon.classList.remove('bi-heart');
            countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
        } else {
            icon.classList.add('bi-heart');
            icon.classList.remove('bi-heart-fill', 'text-danger');
            countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
        }
    }
}

function openPost(postId) {
    window.location.href = '/post.html?id=' + encodeURIComponent(postId) + '&from=reels';
}

function shareReel(postId) {
    const url = `${window.location.origin}/post.html?id=${postId}`;

    if (navigator.share) {
        navigator.share({ title: 'Пост от ВетКлиники Симба', url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Ссылка скопирована!');
        });
    }
}

document.addEventListener('keydown', (e) => {
    const container = document.getElementById('reelsContainer');
    if (!container) return;

    const items = container.querySelectorAll('.reel-item');
    if (items.length === 0) return;

    const itemHeight = window.innerHeight;
    const currentIdx = Math.round(container.scrollTop / itemHeight);

    if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        const next = Math.min(currentIdx + 1, items.length - 1);
        container.scrollTo({ top: next * itemHeight, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(currentIdx - 1, 0);
        container.scrollTo({ top: prev * itemHeight, behavior: 'smooth' });
    }
});