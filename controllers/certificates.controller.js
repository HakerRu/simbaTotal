const Certificate = require('../models/Certificate');
const { deleteManyFromS3 } = require('../utils/s3');

const isStaff = (req) => Boolean(req.user && (req.user.role === 'admin' || req.user.role === 'manager'));

exports.getCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.getAll(true);
        res.json({ success: true, certificates });
    } catch (e) {
        console.error('Ошибка загрузки сертификатов:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getAllCertificatesAdmin = async (req, res) => {
    try {
        const certificates = await Certificate.getAll(false);
        res.json({ success: true, certificates });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.getById(req.params.id, { publishedOnly: !isStaff(req) });
        if (!certificate) return res.status(404).json({ success: false, message: 'Сертификат не найден' });
        res.json({ success: true, certificate });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.createCertificate = async (req, res) => {
    try {
        const { certificateName, certificateDescription, issueDate, fileUrl, fileKey, isPublished } = req.body;

        if (!certificateName) {
            return res.status(400).json({ success: false, message: 'Название обязательно' });
        }

        const certificate = await Certificate.create({
            certificateName,
            certificateDescription,
            issueDate,
            fileUrl,
            fileKey,
            isPublished
        });

        res.status(201).json({ success: true, certificate });
    } catch (e) {
        console.error('Ошибка создания:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateCertificate = async (req, res) => {
    try {
        const existing = await Certificate.getById(req.params.id, { publishedOnly: false });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Сертификат не найден' });
        }

        const certificate = await Certificate.update(req.params.id, req.body);
        if (req.body.fileKey && existing.fileKey && req.body.fileKey !== existing.fileKey) {
            await deleteManyFromS3([existing.fileKey]);
        }

        res.json({ success: true, certificate });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteCertificate = async (req, res) => {
    try {
        const existing = await Certificate.getById(req.params.id, { publishedOnly: false });
        await Certificate.delete(req.params.id);
        if (existing?.fileKey) {
            await deleteManyFromS3([existing.fileKey]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};