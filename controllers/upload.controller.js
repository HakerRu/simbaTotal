const { uploadToS3, deleteFromS3 } = require('../utils/s3');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const folder = req.body.folder || 'products';
        const result = await uploadToS3(req.file, folder);

        res.json({
            success: true,
            url: result.url,
            key: result.key
        });
    } catch (e) {
        console.error('Ошибка загрузки в S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка загрузки: ' + e.message });
    }
};

exports.uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Файлы не загружены' });
        }

        const folder = req.body.folder || 'products';
        const results = [];

        for (const file of req.files) {
            const result = await uploadToS3(file, folder);
            results.push(result);
        }

        res.json({ success: true, files: results });
    } catch (e) {
        console.error('Ошибка загрузки в S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка загрузки: ' + e.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ success: false, message: 'Ключ не указан' });

        await deleteFromS3(key);
        res.json({ success: true, message: 'Файл удалён' });
    } catch (e) {
        console.error('Ошибка удаления из S3:', e);
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};