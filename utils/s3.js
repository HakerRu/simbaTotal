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
    await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    }));
};

module.exports = { uploadToS3, deleteFromS3 };