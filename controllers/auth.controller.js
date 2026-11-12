const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail } = require('../utils/mailer');

exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
        }

        const { userEmail, userPassword, userFirstName, userLastName, userPhone, role } = req.body;

        const existingUser = await User.findByEmail(userEmail);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
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
            role: role || 'client',
            doctorStatus: role === 'doctor' ? 'pending' : null,
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

            await User.updateRefreshToken(user.userId, refreshToken, refreshTokenExpires);
            await User.updateLastLogin(user.userId);

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 15 * 60 * 1000
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }

        res.redirect(`/register.html?verified=true&role=${user.role}`);

    } catch (error) {
        console.error('Ошибка верификации:', error);
        res.redirect(`/register.html?verified=false&reason=error`);
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { userEmail } = req.body;

        const user = await User.findByEmail(userEmail);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'Email уже подтверждён' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await User.updateVerificationToken(user.userId, verificationToken, verificationExpires);

        const emailResult = await sendVerificationEmail(userEmail, user.userFirstName, verificationToken);

        res.json({
            success: true,
            message: emailResult.success
                ? 'Письмо с подтверждением отправлено повторно'
                : 'Не удалось отправить письмо, попробуйте позже'
        });

    } catch (error) {
        console.error('Ошибка повторной отправки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.login = async (req, res) => {
    try {
        console.log(req.body)
        const { userEmail, userPassword } = req.body;

        // Хардкод-админ — проверяем ДО валидации
        if ((userEmail === '@admin' || userEmail === 'admin') && userPassword === 'simba2024') {
            const accessToken = jwt.sign(
                { userId: 0, email: 'admin', role: 'admin' },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: process.env.JWT_ACCESS_EXPIRES }
            );
            const refreshToken = jwt.sign(
                { userId: 0, email: 'admin', role: 'admin' },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: process.env.JWT_REFRESH_EXPIRES }
            );

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 15 * 60 * 1000
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.json({
                success: true,
                message: 'Вход выполнен успешно',
                user: {
                    userId: 0,
                    userEmail: 'admin',
                    userFirstName: 'Администратор',
                    userLastName: 'Симба',
                    role: 'admin'
                }
            });
        }

        // Валидация для обычных пользователей
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

        await User.updateRefreshToken(user.userId, refreshToken, refreshTokenExpires);
        await User.updateLastLogin(user.userId);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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

exports.logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = verifyRefreshToken(token);
                if (decoded.userId !== 0) {
                    await User.removeRefreshToken(decoded.userId);
                }
            } catch (e) {}
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({ success: true, message: 'Выход выполнен успешно' });
    } catch (error) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Выход выполнен успешно' });
    }
};

exports.getMe = async (req, res) => {
    try {
        // Хардкод-админ
        if (req.user.userId === 0) {
            return res.json({
                success: true,
                user: {
                    userId: 0,
                    userEmail: 'admin',
                    userFirstName: 'Администратор',
                    userLastName: 'Симба',
                    role: 'admin',
                    avatarUrl: null,
                    userPhone: null,
                    isEmailVerified: true
                }
            });
        }

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