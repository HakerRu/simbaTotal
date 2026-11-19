let galleryState = {
    albums: [],
    currentAlbum: null,
    currentPhotoIndex: 0
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadAlbums();
});

async function loadAlbums() {
    try {
        const data = await API.get('/gallery/albums');
        if (data.success) {
            galleryState.albums = data.albums;
            renderAlbums();
        }
    } catch (e) {
        console.error('Ошибка загрузки альбомов:', e);
    }
}

function renderAlbums() {
    const container = document.getElementById('albumsGrid');

    if (galleryState.albums.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-images display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Галерея пока пуста</h4>
                <p class="text-muted">Фотографии появятся здесь позже</p>
            </div>`;
        return;
    }

    container.innerHTML = galleryState.albums.map(album => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card album-card border-0 shadow-sm h-100" data-album-id="${escapeHtml(album.albumId)}" style="cursor:pointer">
                <div class="position-relative overflow-hidden" style="height:200px">
                    ${safeUrl(album.coverImageUrl) ? `
                        <img src="${safeUrl(album.coverImageUrl)}" class="card-img-top h-100 w-100" alt="${escapeHtml(album.albumName)}" style="object-fit:cover">
                    ` : `
                        <div class="bg-light d-flex align-items-center justify-content-center h-100">
                            <i class="bi bi-folder2 text-muted fs-1"></i>
                        </div>
                    `}
                    <div class="position-absolute bottom-0 start-0 w-100 p-2" style="background:linear-gradient(transparent, rgba(0,0,0,0.7))">
                        <small class="text-white"><i class="bi bi-images"></i> ${album.photoCount || 0} фото</small>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title fw-bold mb-1">${escapeHtml(album.albumName)}</h6>
                    <small class="text-muted">${escapeHtml((album.albumDescription || '').substring(0, 60))}</small>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.album-card').forEach(card => {
        card.addEventListener('click', () => openAlbum(card.dataset.albumId));
    });
}

async function openAlbum(albumId) {
    try {
        const data = await API.get(`/gallery/albums/${albumId}`);
        if (data.success) {
            galleryState.currentAlbum = data.album;
            galleryState.currentPhotoIndex = 0;

            if (data.album.photos && data.album.photos.length > 0) {
                showLightbox();
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки альбома:', e);
    }
}

function showLightbox() {
    const modal = new bootstrap.Modal(document.getElementById('lightboxModal'));
    const album = galleryState.currentAlbum;

    updateLightboxImage();

    document.getElementById('prevPhoto').onclick = () => {
        if (galleryState.currentPhotoIndex > 0) {
            galleryState.currentPhotoIndex--;
            updateLightboxImage();
        }
    };

    document.getElementById('nextPhoto').onclick = () => {
        if (galleryState.currentPhotoIndex < album.photos.length - 1) {
            galleryState.currentPhotoIndex++;
            updateLightboxImage();
        }
    };

    // Клавиши
    const keyHandler = (e) => {
        if (e.key === 'ArrowLeft') document.getElementById('prevPhoto').click();
        if (e.key === 'ArrowRight') document.getElementById('nextPhoto').click();
        if (e.key === 'Escape') modal.hide();
    };

    document.addEventListener('keydown', keyHandler);
    document.getElementById('lightboxModal').addEventListener('hidden.bs.modal', () => {
        document.removeEventListener('keydown', keyHandler);
    }, { once: true });

    modal.show();
}

function updateLightboxImage() {
    const album = galleryState.currentAlbum;
    const photo = album.photos[galleryState.currentPhotoIndex];

    document.getElementById('lightboxImage').src = photo.photoUrl;
    document.getElementById('lightboxCaption').textContent = photo.photoCaption || '';
    document.getElementById('photoCounter').textContent = `${galleryState.currentPhotoIndex + 1} / ${album.photos.length}`;

    document.getElementById('prevPhoto').style.visibility = galleryState.currentPhotoIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('nextPhoto').style.visibility = galleryState.currentPhotoIndex === album.photos.length - 1 ? 'hidden' : 'visible';
}