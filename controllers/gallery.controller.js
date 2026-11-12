const Gallery = require('../models/Gallery');
const { slugify } = require('../utils/helpers');

exports.getAlbums = async (req, res) => {
    try {
        const albums = await Gallery.getAllAlbums(true);
        res.json({ success: true, albums });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getAlbum = async (req, res) => {
    try {
        const album = await Gallery.getAlbumById(req.params.id);
        if (!album) return res.status(404).json({ success: false, message: 'Альбом не найден' });
        res.json({ success: true, album });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getAllAlbumsAdmin = async (req, res) => {
    try {
        const albums = await Gallery.getAllAlbums(false);
        res.json({ success: true, albums });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.createAlbum = async (req, res) => {
    try {
        const { albumName, photos } = req.body;

        if (!albumName) return res.status(400).json({ success: false, message: 'Название обязательно' });
        if (!photos || photos.length === 0) return res.status(400).json({ success: false, message: 'Загрузите хотя бы одно фото' });

        // Обложка — первое фото
        const album = await Gallery.createAlbum({
            albumName,
            albumSlug: slugify(albumName) + '-' + Date.now(),
            coverImageUrl: photos[0].url,
            coverImageKey: photos[0].key,
            isPublished: true
        });

        await Gallery.addPhotos(album.albumId, photos);

        res.status(201).json({ success: true, album });
    } catch (e) {
        console.error('Ошибка создания альбома:', e);
        res.status(500).json({ success: false, message: 'Ошибка: ' + e.message });
    }
};

exports.updateAlbum = async (req, res) => {
    try {
        const { albumName, photos } = req.body;

        const updateData = {};
        if (albumName) updateData.albumName = albumName;
        if (photos && photos.length > 0) {
            updateData.coverImageUrl = photos[0].url;
            updateData.coverImageKey = photos[0].key;
        }

        await Gallery.updateAlbum(req.params.id, updateData);

        // Если передали новые фото — заменяем все
        if (photos !== undefined && photos.length > 0) {
            await Gallery.deletePhotosByAlbum(req.params.id);
            await Gallery.addPhotos(req.params.id, photos);
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Ошибка обновления:', e);
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteAlbum = async (req, res) => {
    try {
        await Gallery.deleteAlbum(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};