const { uploadToS3, deleteFromS3 } = require('../utils/s3');

const ALLOWED_FOLDERS = new Set(['products', 'posts', 'gallery', 'certificates', 'avatars']);

const safeFolder = (folder) => {
    if (typeof folder !== 'string') return null;
    const clean = folder.trim();
    return ALLOWED_FOLDERS.has(clean) ? clean : null;
};

const safeKey = (key) => {
    if (typeof key !== 'string' || key.length > 500) return null;
    if (key.includes('..') || key.includes('\\') || key.startsWith('/')) return null;
    const folder = key.split('/')[0];
    if (!ALLOWED_FOLDERS.has(folder)) return null;
    if (!/^[\w.\-\/]+$/.test(key)) return null;
    return key;
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const folder = safeFolder(req.body.folder);
        if (!folder) {
            return res.status(400).json({ success: false, message: 'Недопустимая папка' });
        }

        const result = await uploadToS3(req.file, folder);
        res.json({ success: true, url: result.url, key: result.key });
    } catch (e) {
        console.error('Ошибка загрузки в S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка загрузки' });
    }
};

exports.uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Файлы не загружены' });
        }

        const folder = safeFolder(req.body.folder);
        if (!folder) {
            return res.status(400).json({ success: false, message: 'Недопустимая папка' });
        }

        const results = [];
        for (const file of req.files) {
            results.push(await uploadToS3(file, folder));
        }

        res.json({ success: true, files: results });
    } catch (e) {
        console.error('Ошибка загрузки в S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка загрузки' });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const key = safeKey(req.body.key);
        if (!key) return res.status(400).json({ success: false, message: 'Ключ не указан' });

        await deleteFromS3(key);
        res.json({ success: true, message: 'Файл удалён' });
    } catch (e) {
        console.error('Ошибка удаления из S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};
