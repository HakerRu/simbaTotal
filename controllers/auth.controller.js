const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { sendVerificationEmail } = require('../utils/mailer');
const { cookieOptions } = require('../utils/cookies');

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, cookieOptions(ACCESS_MAX_AGE));
    res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_MAX_AGE));
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', cookieOptions());
    res.clearCookie('refreshToken', cookieOptions());
};

exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
        }

        const { userEmail, userPassword, userFirstName, userLastName, userPhone, role } = req.body;
        const safeRole = role === 'doctor' ? 'doctor' : 'client';

        const existingUser = await User.findByEmail(userEmail);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Не удалось зарегистрироваться. Проверьте данные или войдите.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userPassword, salt);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await User.create({
            userEmail,
            userPassword: hashedPassword,
            userFirstName,
            userLastName,
            userPhone: userPhone || null,
            role: safeRole,
            doctorStatus: safeRole === 'doctor' ? 'pending' : null,
            isEmailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires
        });

        const emailResult = await sendVerificationEmail(userEmail, userFirstName, verificationToken);

        res.status(201).json({
            success: true,
            message: emailResult.success
                ? 'Регистрация успешна! На ваш email отправлена ссылка для подтверждения.'
                : 'Регистрация успешна, но не удалось отправить письмо. Попробуйте позже.',
            user: {
                userId: user.userId,
                userEmail: user.userEmail,
                userFirstName: user.userFirstName,
                role: user.role,
                doctorStatus: user.doctorStatus,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect(`/register.html?verified=false&reason=no-token`);
        }

        const user = await User.findByVerificationToken(token);

        if (!user) {
            return res.redirect(`/register.html?verified=false&reason=invalid`);
        }

        if (new Date() > new Date(user.emailVerificationExpires)) {
            return res.redirect(`/register.html?verified=false&reason=expired`);
        }

        await User.verifyEmail(user.userId);

        if (user.role === 'client') {
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);
            const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await User.updateRefreshToken(user.userId, hashToken(refreshToken), refreshTokenExpires);
            await User.updateLastLogin(user.userId);
            setAuthCookies(res, accessToken, refreshToken);
        }

        res.redirect(`/register.html?verified=true&role=${user.role}`);

    } catch (error) {
        console.error('Ошибка верификации:', error);
        res.redirect(`/register.html?verified=false&reason=error`);
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0]?.msg || 'Некорректный email', errors: errors.array() });
        }

        const { userEmail } = req.body;

        const generic = {
            success: true,
            message: 'Если аккаунт существует и email не подтверждён, письмо отправлено'
        };

        const user = await User.findByEmail(userEmail);
        if (!user || user.isEmailVerified) {
            return res.json(generic);
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await User.updateVerificationToken(user.userId, verificationToken, verificationExpires);

        const emailResult = await sendVerificationEmail(userEmail, user.userFirstName, verificationToken);

        res.json(emailResult.success
            ? generic
            : { success: false, message: 'Не удалось отправить письмо, попробуйте позже' });

    } catch (error) {
        console.error('Ошибка повторной отправки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.login = async (req, res) => {
    try {
        const { userEmail, userPassword } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
        }

        // Обычный вход
        const user = await User.findByEmail(userEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({ success: false, message: 'Email не подтверждён. Проверьте почту или запросите письмо повторно.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Ваш аккаунт деактивирован' });
        }

        if (user.role === 'doctor' && user.doctorStatus !== 'approved') {
            return res.status(403).json({ success: false, message: 'Ваш аккаунт врача ещё не одобрен администратором' });
        }

        const isValidPassword = await bcrypt.compare(userPassword, user.userPassword);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await User.updateRefreshToken(user.userId, hashToken(refreshToken), refreshTokenExpires);
        await User.updateLastLogin(user.userId);
        setAuthCookies(res, accessToken, refreshToken);

        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            user: {
                userId: user.userId,
                userEmail: user.userEmail,
                userFirstName: user.userFirstName,
                userLastName: user.userLastName,
                role: user.role,
                doctorStatus: user.doctorStatus,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при входе' });
    }
};

exports.refresh = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        }

        const decoded = verifyRefreshToken(token);
        const user = decoded?.userId ? await User.findById(decoded.userId) : null;

        if (!user || !user.isActive || !user.isEmailVerified) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Сессия недействительна' });
        }

        if (user.role === 'doctor' && user.doctorStatus !== 'approved') {
            clearAuthCookies(res);
            return res.status(403).json({ success: false, message: 'Аккаунт врача не одобрен' });
        }

        if (!user.refreshToken || !user.refreshTokenExpires || new Date(user.refreshTokenExpires) <= new Date()) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Сессия истекла' });
        }

        const incomingHash = Buffer.from(hashToken(token), 'hex');
        const storedHash = Buffer.from(user.refreshToken, 'hex');
        if (incomingHash.length !== storedHash.length || !crypto.timingSafeEqual(incomingHash, storedHash)) {
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: 'Сессия недействительна' });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        const refreshTokenExpires = new Date(Date.now() + REFRESH_MAX_AGE);

        await User.updateRefreshToken(user.userId, hashToken(newRefreshToken), refreshTokenExpires);
        setAuthCookies(res, newAccessToken, newRefreshToken);

        return res.json({ success: true });
    } catch (error) {
        clearAuthCookies(res);
        return res.status(401).json({ success: false, message: 'Сессия истекла' });
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = verifyRefreshToken(token);
                if (decoded.userId) {
                    await User.removeRefreshToken(decoded.userId);
                }
            } catch (e) {}
        }

        clearAuthCookies(res);

        res.json({ success: true, message: 'Выход выполнен успешно' });
    } catch (error) {
        clearAuthCookies(res);
        res.json({ success: true, message: 'Выход выполнен успешно' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        res.json({
            success: true,
            user: {
                userId: user.userId,
                userEmail: user.userEmail,
                userPhone: user.userPhone,
                userFirstName: user.userFirstName,
                userLastName: user.userLastName,
                role: user.role,
                doctorStatus: user.doctorStatus,
                avatarUrl: user.avatarUrl,
                doctorSpecialization: user.doctorSpecialization,
                doctorDescription: user.doctorDescription,
                doctorExperienceYears: user.doctorExperienceYears,
                doctorEducation: user.doctorEducation,
                vkLink: user.vkLink,
                telegramLink: user.telegramLink,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};