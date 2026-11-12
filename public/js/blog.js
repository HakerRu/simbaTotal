let blogState = {
    posts: [],
    activeType: 'all',
    page: 1,
    perPage: 9,
    totalPages: 0
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadPosts();
    setupFilters();
});

async function loadPosts() {
    try {
        const params = new URLSearchParams({
            type: blogState.activeType,
            page: blogState.page,
            limit: blogState.perPage
        });

        const data = await API.get(`/blog?${params}`);
        if (data.success) {
            blogState.posts = data.posts;
            blogState.totalPages = Math.ceil(data.total / blogState.perPage);
            renderPosts();
            renderPagination();
        }
    } catch (e) {
        console.error('Ошибка загрузки постов:', e);
        document.getElementById('postsGrid').innerHTML = '<div class="col-12 text-center text-danger">Ошибка загрузки</div>';
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            blogState.activeType = btn.dataset.type;
            blogState.page = 1;
            loadPosts();
        });
    });
}

function renderPosts() {
    const container = document.getElementById('postsGrid');

    if (blogState.posts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-newspaper display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Постов пока нет</h4>
                <p class="text-muted">Загляните позже</p>
            </div>`;
        return;
    }

    container.innerHTML = blogState.posts.map(post => {
        const cover = post.media && post.media[0] ? post.media[0] : null;
        const coverSrc = cover ? safeUrl(cover.mediaUrl) : '';
        const isReel = post.postType === 'reel';

        return `
        <div class="col-md-6 col-lg-4">
            <a href="/post.html?id=${encodeURIComponent(post.postId)}" class="text-decoration-none">
                <div class="card blog-card border-0 shadow-sm h-100">
                    <div class="position-relative overflow-hidden" style="height:220px">
                        ${coverSrc ? `
                            <img src="${coverSrc}" class="w-100 h-100" alt="${escapeHtml(post.postTitle)}" style="object-fit:cover">
                        ` : `
                            <div class="bg-light d-flex align-items-center justify-content-center h-100">
                                <i class="bi bi-image text-muted fs-1"></i>
                            </div>
                        `}
                        ${isReel ? `
                            <div class="position-absolute top-0 end-0 m-2">
                                <span class="badge bg-dark bg-opacity-75">
                                    <i class="bi bi-play-fill"></i> Рилс
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex gap-2 mb-2 flex-wrap">
                            <span class="badge bg-primary bg-opacity-10 text-primary">
                                ${isReel ? '🎬 Рилс' : '📝 Статья'}
                            </span>
                            <span class="badge bg-light text-muted">
                                <i class="bi bi-calendar"></i> ${new Date(post.createDate).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                        <h5 class="card-title fw-bold text-dark">${escapeHtml(post.postTitle)}</h5>
                        <p class="card-text text-muted small flex-grow-1">${escapeHtml((post.postContent || '').substring(0, 120))}${post.postContent && post.postContent.length > 120 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                            <small class="text-muted"><i class="bi bi-eye"></i> ${post.postViews || 0}</small>
                            <small class="text-primary">Читать <i class="bi bi-arrow-right"></i></small>
                        </div>
                    </div>
                </div>
            </a>
        </div>`;
    }).join('');
}

function renderPagination() {
    const nav = document.getElementById('paginationNav');
    const list = document.getElementById('paginationList');

    if (blogState.totalPages <= 1) {
        if (nav) nav.style.display = 'none';
        return;
    }

    if (nav) nav.style.display = 'block';
    let html = '';

    html += `<li class="page-item ${blogState.page === 1 ? 'disabled' : ''}">
        <a class="page-link rounded-pill mx-1" href="#" data-page="${blogState.page - 1}"><i class="bi bi-chevron-left"></i></a>
    </li>`;

    for (let i = 1; i <= blogState.totalPages; i++) {
        html += `<li class="page-item ${i === blogState.page ? 'active' : ''}">
            <a class="page-link rounded-pill mx-1" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    html += `<li class="page-item ${blogState.page === blogState.totalPages ? 'disabled' : ''}">
        <a class="page-link rounded-pill mx-1" href="#" data-page="${blogState.page + 1}"><i class="bi bi-chevron-right"></i></a>
    </li>`;

    list.innerHTML = html;

    list.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (page >= 1 && page <= blogState.totalPages) {
                blogState.page = page;
                loadPosts();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        });
    });
}