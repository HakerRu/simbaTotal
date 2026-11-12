const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const { slugify } = require('../utils/helpers');

exports.getServices = async (req, res) => {
    try {
        const services = await Service.getAll(req.query.categoryId || null);
        res.json({ success: true, services });
    } catch (e) {
        console.error('Ошибка загрузки услуг:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getService = async (req, res) => {
    try {
        const service = await Service.getById(req.params.id);
        if (!service) return res.status(404).json({ success: false, message: 'Услуга не найдена' });
        res.json({ success: true, service });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.createService = async (req, res) => {
    try {
        const servicePrice = Number(req.body.servicePrice);
        const durationMinutes = Number(req.body.durationMinutes ?? 30);
        if (!req.body.serviceName || !Number.isFinite(servicePrice) || servicePrice < 0 || !Number.isInteger(durationMinutes) || durationMinutes < 0) {
            return res.status(400).json({ success: false, message: 'Проверьте название, цену и длительность' });
        }

        const service = await Service.create({
            serviceName: req.body.serviceName,
            serviceSlug: slugify(req.body.serviceName) + '-' + Date.now(),
            serviceDescription: req.body.serviceDescription,
            servicePrice,
            durationMinutes,
            categoryId: req.body.categoryId || null
        });
        res.status(201).json({ success: true, service });
    } catch (e) {
        console.error('Ошибка создания услуги:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateService = async (req, res) => {
    try {
        if (req.body.servicePrice !== undefined && (!Number.isFinite(Number(req.body.servicePrice)) || Number(req.body.servicePrice) < 0)) {
            return res.status(400).json({ success: false, message: 'Некорректная цена' });
        }
        if (req.body.durationMinutes !== undefined && (!Number.isInteger(Number(req.body.durationMinutes)) || Number(req.body.durationMinutes) < 0)) {
            return res.status(400).json({ success: false, message: 'Некорректная длительность' });
        }

        const service = await Service.update(req.params.id, req.body);
        res.json({ success: true, service });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteService = async (req, res) => {
    try {
        await Service.delete(req.params.id);
        res.json({ success: true, message: 'Услуга удалена' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await ServiceCategory.getAll();
        res.json({ success: true, categories });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const category = await ServiceCategory.create({ ...req.body, categorySlug: slugify(req.body.categoryName) });
        res.status(201).json({ success: true, category });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка создания категории' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await ServiceCategory.update(req.params.id, req.body);
        res.json({ success: true, category });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await ServiceCategory.delete(req.params.id);
        res.json({ success: true, message: 'Категория удалена' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};