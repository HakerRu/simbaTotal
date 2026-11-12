const User = require('../models/User');
const db = require('../database/db');
exports.getUsers = async (req, res) => {
    try {
        const filters = {
            role: req.query.role,
            doctorStatus: req.query.doctorStatus,
            isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
        };
        const users = await User.getAll(filters);
        res.json({ success: true, users, total: users.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const user = await User.updateStatus(req.params.id, req.body);
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.getPendingDoctors = async (req, res) => {
    try {
        const doctors = await User.getPendingDoctors();
        res.json({ success: true, doctors });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};
exports.getStats = async (req, res) => {
    try {
        const [users, doctors, orders, posts] = await Promise.all([
            db.query('SELECT COUNT(*) FROM users'),
            db.query('SELECT COUNT(*) FROM users WHERE role = $1 AND "doctorStatus" = $2', ['doctor', 'pending']),
            db.query('SELECT COUNT(*) FROM orders'),
            db.query('SELECT COUNT(*) FROM posts')
        ]);

        res.json({
            success: true,
            stats: {
                users: parseInt(users.rows[0].count),
                pendingDoctors: parseInt(doctors.rows[0].count),
                orders: parseInt(orders.rows[0].count),
                posts: parseInt(posts.rows[0].count)
            }
        });
    } catch (e) {
        console.error('Ошибка статистики:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};