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

const DOCTOR_PROFILE_FIELDS = [
    'userFirstName', 'userLastName', 'userPhone', 'avatarUrl',
    'doctorSpecialization', 'doctorDescription', 'doctorExperienceYears',
    'doctorEducation', 'doctorPortfolio', 'doctorCertificatesList',
    'doctorServices', 'doctorStatusText', 'vkLink', 'telegramLink',
    'doctorInstagram', 'doctorWhatsapp'
];

const pickProfileFields = (body, allowedFields) => {
    const updateData = {};
    for (const key of allowedFields) {
        if (body[key] !== undefined) updateData[key] = body[key];
    }
    return updateData;
};

exports.DOCTOR_PROFILE_FIELDS = DOCTOR_PROFILE_FIELDS;
exports.pickProfileFields = pickProfileFields;

exports.updateMyProfile = async (req, res) => {
    try {
        const updateData = pickProfileFields(req.body, DOCTOR_PROFILE_FIELDS);

        const user = await User.updateProfile(req.user.userId, updateData);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
        }
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};