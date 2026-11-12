const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

const ALLOWED_FOLDERS = new Set(['products', 'posts', 'gallery', 'certificates', 'avatars']);

const uploadToS3 = async (file, folder = 'products') => {
    if (!ALLOWED_FOLDERS.has(folder)) {
        throw new Error('Недопустимая папка');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${crypto.randomBytes(16).toString('hex')}${ext}`;

    // Определяем ContentType
    let contentType = file.mimetype;
    if (ext.toLowerCase() === '.mov') contentType = 'video/quicktime';
    if (ext.toLowerCase() === '.mp4') contentType = 'video/mp4';
    if (ext.toLowerCase() === '.webm') contentType = 'video/webm';

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
    }));

    return {
        key,
        url: `${process.env.S3_PUBLIC_URL}/${key}`
    };
};

const deleteFromS3 = async (key) => {
    if (!key) return;
    await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    }));
};

const deleteManyFromS3 = async (keys = []) => {
    const uniqueKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim()))];
    for (const key of uniqueKeys) {
        try {
            await deleteFromS3(key);
        } catch (err) {
            console.error(`Ошибка удаления файла из S3 (${key}):`, err.message);
        }
    }
};

module.exports = { uploadToS3, deleteFromS3, deleteManyFromS3 };