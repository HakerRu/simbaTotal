const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const { cookieOptions } = require('../utils/cookies');

const isAuthenticated = async (req, res, next) => {
    const token = req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    try {
        const decoded = verifyAccessToken(token);
        const user = decoded?.userId ? await User.findById(decoded.userId) : null;

        if (!user || !user.isActive || !user.isEmailVerified) {
            res.clearCookie('accessToken', cookieOptions());
            return res.status(401).json({ success: false, message: 'Токен истёк или недействителен' });
        }

        if (user.role === 'doctor' && user.doctorStatus !== 'approved') {
            return res.status(403).json({ success: false, message: 'Аккаунт врача не одобрен' });
        }

        req.user = {
            userId: user.userId,
            email: user.userEmail,
            role: user.role,
            doctorStatus: user.doctorStatus,
        };
        next();
    } catch (error) {
        res.clearCookie('accessToken', cookieOptions());
        return res.status(401).json({ success: false, message: 'Токен истёк или недействителен' });
    }
};

module.exports = { isAuthenticated };
