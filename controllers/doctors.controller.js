const User = require('../models/User');

exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await User.getDoctors(true);
        res.json({ success: true, doctors });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await User.findPublicDoctor(req.params.id);
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Врач не найден' });
        }
        res.json({ success: true, doctor });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

exports.updateMyProfile = async (req, res) => {
    try {
        const allowed = [
            'userFirstName', 'userLastName', 'userPhone', 'avatarUrl',
            'doctorSpecialization', 'doctorDescription', 'doctorExperienceYears',
            'doctorEducation', 'doctorPortfolio', 'doctorCertificatesList',
            'doctorServices', 'doctorStatusText', 'vkLink', 'telegramLink',
            'doctorInstagram', 'doctorWhatsapp'
        ];

        const updateData = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updateData[key] = req.body[key];
        }

        const user = await User.updateProfile(req.user.userId, updateData);
        res.json({ success: true, user: User.toPublic(user) });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};