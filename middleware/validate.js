const { validationResult } = require('express-validator');

/**
 * Validates that a route parameter is a positive integer ID (PostgreSQL bigint).
 */
const validateId = (paramName = 'id') => (req, res, next) => {
    const raw = req.params[paramName];
    if (!/^\d+$/.test(String(raw)) || BigInt(raw) <= 0n) {
        return res.status(400).json({ success: false, message: 'Некорректный идентификатор' });
    }
    next();
};

/**
 * Formats express-validator errors into a 400 JSON response.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstMsg = errors.array()[0]?.msg || 'Ошибка валидации';
        return res.status(400).json({
            success: false,
            message: firstMsg,
            errors: errors.array()
        });
    }
    next();
};

module.exports = { validateId, handleValidationErrors };
