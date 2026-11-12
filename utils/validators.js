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
];

const loginValidator = [
    body('userEmail')
        .isEmail().withMessage('Введите корректный email')
        .normalizeEmail(),
    body('userPassword')
        .isLength({ min: 1 }).withMessage('Введите пароль'),
];

const productValidator = [
    body('productName').trim().isLength({ min: 2 }).withMessage('Название минимум 2 символа'),
    body('productPrice').isFloat({ min: 0 }).withMessage('Цена должна быть положительной'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Количество должно быть положительным'),
];

const orderValidator = [
    body('customerName').trim().isLength({ min: 2 }).withMessage('Введите имя'),
    body('customerPhone').matches(/^\+?[0-9\s\-\(\)]{7,20}$/).withMessage('Некорректный номер'),
    body('pickupDate').isDate().withMessage('Выберите дату'),
    body('pickupTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Выберите время'),
];

const postValidator = [
    body('postTitle').trim().isLength({ min: 3 }).withMessage('Заголовок минимум 3 символа'),
    body('postContent').trim().isLength({ min: 10 }).withMessage('Содержание минимум 10 символов'),
];

const doctorProfileValidator = [
    body('doctorSpecialization').optional({ checkFalsy: true }).trim(),
    body('doctorDescription').optional({ checkFalsy: true }).trim(),
    body('doctorExperienceYears').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Стаж положительным числом'),
    body('vkLink').optional({ checkFalsy: true }).isURL().withMessage('Некорректная ссылка VK'),
    body('telegramLink').optional({ checkFalsy: true }).isURL().withMessage('Некорректная ссылка Telegram'),
];

module.exports = {
    registerValidator,
    loginValidator,
    productValidator,
    orderValidator,
    postValidator,
    doctorProfileValidator,
};