const { verifyAccessToken } = require('../utils/jwt');

const isAuthenticated = (req, res, next) => {
    const token = req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie('accessToken');
        return res.status(401).json({ success: false, message: 'Токен истёк или недействителен' });
    }
};

module.exports = { isAuthenticated };