const db = require('../database/db');

class Gallery {
    // Альбомы
    static async getAllAlbums(publishedOnly = true) {
        let query = `SELECT a.*,
                     (SELECT COUNT(*) FROM gallery_photos p WHERE p."albumId" = a."albumId") as "photoCount"
                     FROM gallery_albums a`;
        if (publishedOnly) query += ` WHERE a."isPublished" = true`;
        query += ` ORDER BY a."createDate" DESC`;

        const result = await db.query(query);
        return result.rows;
    }

    static async getAlbumById(albumId, { publishedOnly = true } = {}) {
        let query = 'SELECT * FROM gallery_albums WHERE "albumId" = $1';
        if (publishedOnly) query += ' AND "isPublished" = true';
        const albumResult = await db.query(query, [albumId]);
        if (!albumResult.rows[0]) return null;

        const album = albumResult.rows[0];
        const photosResult = await db.query(
            'SELECT * FROM gallery_photos WHERE "albumId" = $1 ORDER BY "sortOrder"',
            [albumId]
        );
        album.photos = photosResult.rows;
        return album;
    }

    static async getAlbumKeys(albumId) {
        const albumRes = await db.query('SELECT "coverImageKey" FROM gallery_albums WHERE "albumId" = $1', [albumId]);
        const photosRes = await db.query('SELECT "photoKey" FROM gallery_photos WHERE "albumId" = $1', [albumId]);
        return [
            albumRes.rows[0]?.coverImageKey,
            ...photosRes.rows.map((r) => r.photoKey)
        ].filter(Boolean);
    }

    static async createAlbum({ albumName, albumSlug, albumDescription, coverImageUrl, coverImageKey, isPublished }) {
        if (!albumSlug || albumSlug.trim() === '') {
            albumSlug = 'album-' + Date.now();
        }

        const result = await db.query(
            `INSERT INTO gallery_albums ("albumName", "albumSlug", "albumDescription", "coverImageUrl", "coverImageKey", "isPublished")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [albumName, albumSlug, albumDescription || null, coverImageUrl || null, coverImageKey || null, isPublished !== undefined ? isPublished : true]
        );
        return result.rows[0];
    }

    static async updateAlbum(albumId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowed = ['albumName', 'albumSlug', 'albumDescription', 'coverImageUrl', 'coverImageKey', 'isPublished'];
        for (const [key, value] of Object.entries(data)) {
            if (allowed.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`"${key}" = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) return null;

        paramCount++;
        values.push(albumId);
        const result = await db.query(
            `UPDATE gallery_albums SET ${updates.join(', ')} WHERE "albumId" = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async deleteAlbum(albumId) {
        await db.query('DELETE FROM gallery_photos WHERE "albumId" = $1', [albumId]);
        await db.query('DELETE FROM gallery_albums WHERE "albumId" = $1', [albumId]);
    }

    // Фото
    static async addPhotos(albumId, photos) {
        for (let i = 0; i < photos.length; i++) {
            await db.query(
                `INSERT INTO gallery_photos ("albumId", "photoUrl", "photoKey", "photoCaption", "sortOrder")
                 VALUES ($1, $2, $3, $4, $5)`,
                [albumId, photos[i].url, photos[i].key || null, photos[i].caption || null, i]
            );
        }
    }

    static async deletePhoto(photoId) {
        await db.query('DELETE FROM gallery_photos WHERE "photoId" = $1', [photoId]);
    }

    static async deletePhotosByAlbum(albumId) {
        await db.query('DELETE FROM gallery_photos WHERE "albumId" = $1', [albumId]);
    }
}

module.exports = Gallery;