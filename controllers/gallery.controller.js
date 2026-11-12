const Gallery = require('../models/Gallery');
const { uniqueSlug } = require('../utils/helpers');
const { deleteManyFromS3 } = require('../utils/s3');

const isStaff = (req) => Boolean(req.user && (req.user.role === 'admin' || req.user.role === 'manager'));

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
        const album = await Gallery.getAlbumById(req.params.id, { publishedOnly: !isStaff(req) });
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

        const album = await Gallery.createAlbum({
            albumName,
            albumSlug: uniqueSlug(albumName, 'album'),
            coverImageUrl: photos[0].url,
            coverImageKey: photos[0].key,
            isPublished: true
        });

        await Gallery.addPhotos(album.albumId, photos);

        res.status(201).json({ success: true, album });
    } catch (e) {
        console.error('Ошибка создания альбома:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateAlbum = async (req, res) => {
    try {
        const { albumName, photos } = req.body;

        const existing = await Gallery.getAlbumById(req.params.id, { publishedOnly: false });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Альбом не найден' });
        }

        let oldKeys = [];
        if (photos !== undefined && photos.length > 0) {
            oldKeys = await Gallery.getAlbumKeys(req.params.id);
        }

        const updateData = {};
        if (albumName) updateData.albumName = albumName;
        if (photos && photos.length > 0) {
            updateData.coverImageUrl = photos[0].url;
            updateData.coverImageKey = photos[0].key;
        }

        await Gallery.updateAlbum(req.params.id, updateData);

        if (photos !== undefined && photos.length > 0) {
            await Gallery.deletePhotosByAlbum(req.params.id);
            await Gallery.addPhotos(req.params.id, photos);

            const newKeys = new Set(photos.map((p) => p.key).filter(Boolean));
            await deleteManyFromS3(oldKeys.filter((k) => !newKeys.has(k)));
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Ошибка обновления:', e);
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteAlbum = async (req, res) => {
    try {
        const keys = await Gallery.getAlbumKeys(req.params.id);
        await Gallery.deleteAlbum(req.params.id);
        await deleteManyFromS3(keys);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};