const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const { cookieOptions } = require('../utils/cookies');

const resolveUserFromAccessToken = async (token) => {
    if (!token) return { error: 'no-token' };
    try {
        const decoded = verifyAccessToken(token);
        const user = decoded?.userId ? await User.findById(decoded.userId) : null;

        if (!user || !user.isActive || !user.isEmailVerified) {
            return { error: 'invalid-user' };
        }

        if (user.role === 'doctor' && user.doctorStatus !== 'approved') {
            return { error: 'doctor-not-approved' };
        }

        return {
            user: {
                userId: user.userId,
                email: user.userEmail,
                role: user.role,
                doctorStatus: user.doctorStatus,
            }
        };
    } catch (error) {
        return { error: 'invalid-token' };
    }
};

const isAuthenticated = async (req, res, next) => {
    const result = await resolveUserFromAccessToken(req.cookies?.accessToken);

    if (result.user) {
        req.user = result.user;
        return next();
    }

    if (result.error === 'doctor-not-approved') {
        return res.status(403).json({ success: false, message: 'Аккаунт врача не одобрен' });
    }

    if (result.error !== 'no-token') {
        res.clearCookie('accessToken', cookieOptions());
        return res.status(401).json({ success: false, message: 'Токен истёк или недействителен' });
    }

    return res.status(401).json({ success: false, message: 'Требуется авторизация' });
};

const optionalAuth = async (req, res, next) => {
    const result = await resolveUserFromAccessToken(req.cookies?.accessToken);
    req.user = result.user || null;
    next();
};

module.exports = { isAuthenticated, optionalAuth };
