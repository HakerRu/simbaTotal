const { body } = require('express-validator');

const registerValidator = [
    body('userEmail')
        .isEmail().withMessage('Введите корректный email')
        .normalizeEmail(),
    body('userPassword')
        .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
    body('userFirstName')
        .trim()
        .isLength({ min: 1 }).withMessage('Введите имя'),
    body('userLastName')
        .trim()
        .isLength({ min: 1 }).withMessage('Введите фамилию'),
    body('userPhone')
        .optional({ checkFalsy: true })
        .matches(/^\+?[0-9\s\-\(\)]{7,20}$/).withMessage('Некорректный номер телефона'),
    body('role')
        .optional({ nullable: true })
        .isIn(['client', 'doctor']).withMessage('Некорректная роль'),
];

const loginValidator = [
    body('userEmail')
        .isEmail().withMessage('Введите корректный email')
        .normalizeEmail(),
    body('userPassword')
        .isLength({ min: 1 }).withMessage('Введите пароль'),
];

const resendValidator = [
    body('userEmail')
        .isEmail().withMessage('Введите корректный email')
        .normalizeEmail(),
];

const productValidator = [
    body('productName').trim().isLength({ min: 2 }).withMessage('Название минимум 2 символа'),
    body('productPrice').isFloat({ min: 0 }).withMessage('Цена должна быть положительной'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Количество должно быть положительным'),
];

const PICKUP_ADDRESSES = [
    'г. Нижний Тагил, Ленинградский пр-т, 20',
    'г. Нижний Тагил, ул. Носова, 1',
];

const orderValidator = [
    body('customerName').trim().isLength({ min: 2 }).withMessage('Введите имя'),
    body('customerPhone').matches(/^\+?[0-9\s\-\(\)]{7,20}$/).withMessage('Некорректный номер'),
    body('pickupAddress').trim().isIn(PICKUP_ADDRESSES).withMessage('Выберите адрес самовывоза'),
    body('pickupDate').isDate().withMessage('Выберите дату'),
    body('pickupTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Выберите время'),
];

const postValidator = [
    body('postTitle').trim().isLength({ min: 3 }).withMessage('Заголовок минимум 3 символа'),
    body('postType').optional().isIn(['article', 'reel']).withMessage('Некорректный тип поста'),
    body('postContent').optional({ nullable: true }).isString().trim(),
];

const doctorProfileValidator = [
    body('userFirstName').optional({ checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Введите имя'),
    body('userLastName').optional({ checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Введите фамилию'),
    body('userPhone').optional({ checkFalsy: true }).matches(/^\+?[0-9\s\-\(\)]{7,20}$/).withMessage('Некорректный номер телефона'),
    body('doctorSpecialization').optional({ checkFalsy: true }).trim(),
    body('doctorDescription').optional({ checkFalsy: true }).trim(),
    body('doctorEducation').optional({ checkFalsy: true }).trim(),
    body('doctorExperienceYears')
        .customSanitizer((v) => (v === '' || v === null ? undefined : v))
        .optional()
        .isInt({ min: 0 }).withMessage('Стаж положительным числом'),
    body('vkLink').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Некорректная ссылка VK'),
    body('telegramLink').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Некорректная ссылка Telegram'),
];

const categoryValidator = [
    body('categoryName').trim().isLength({ min: 2 }).withMessage('Название категории минимум 2 символа'),
];

module.exports = {
    registerValidator,
    loginValidator,
    resendValidator,
    productValidator,
    orderValidator,
    postValidator,
    doctorProfileValidator,
    categoryValidator,
};