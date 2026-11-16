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
        if (String(req.params.id) === String(req.user.userId) && req.body.isActive === false) {
            return res.status(400).json({ success: false, message: 'Нельзя деактивировать собственный аккаунт' });
        }

        const target = await User.findById(req.params.id);
        if (!target) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден или нечего обновлять' });
        }
        if (req.user.role !== 'admin' && target.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Менеджер не может менять администратора' });
        }

        const user = await User.updateStatus(req.params.id, req.body);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден или нечего обновлять' });
        }

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.searchStaff = async (req, res) => {
    try {
        const users = await User.searchAppointable(req.query.q || '');
        res.json({ success: true, users });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка поиска' });
    }
};

exports.setManager = async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        if (target.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Нельзя менять роль администратора' });
        }

        const appoint = req.body.appoint === true;
        if (appoint) {
            if (target.role !== 'doctor' || target.doctorStatus !== 'approved') {
                return res.status(400).json({ success: false, message: 'Менеджером можно назначить только одобренного врача' });
            }
        } else if (target.role !== 'manager') {
            return res.status(400).json({ success: false, message: 'Это не менеджер' });
        }

        const user = await User.setRole(req.params.id, appoint ? 'manager' : 'doctor');
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка назначения' });
    }
};

exports.getBlockedUsers = async (req, res) => {
    try {
        await require('../models/Order').expireNoShows();
        const users = await User.getBlockedWithCancellations();
        res.json({ success: true, users });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.unblockOrders = async (req, res) => {
    try {
        const user = await User.unblockOrders(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка разблокировки' });
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