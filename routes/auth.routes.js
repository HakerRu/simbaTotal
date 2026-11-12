const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidator, loginValidator, resendValidator } = require('../utils/validators');
const { isAuthenticated } = require('../middleware/auth');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Слишком много попыток, попробуйте позже' }
});

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', isAuthenticated, authController.getMe);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authLimiter, resendValidator, authController.resendVerification);

module.exports = router;
