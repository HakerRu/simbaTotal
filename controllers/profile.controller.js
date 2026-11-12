const User = require('../models/User');
const { uploadToS3, deleteFromS3 } = require('../utils/s3');
const { DOCTOR_PROFILE_FIELDS, pickProfileFields } = require('./doctors.controller');

const BASIC_PROFILE_FIELDS = ['userFirstName', 'userLastName', 'userPhone'];

exports.updateProfile = async (req, res) => {
    try {
        const allowed = req.user.role === 'doctor' ? DOCTOR_PROFILE_FIELDS : BASIC_PROFILE_FIELDS;
        const updateData = pickProfileFields(req.body, allowed);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
        }

        const user = await User.updateProfile(req.user.userId, updateData);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        res.json({ success: true, user });
    } catch (e) {
        console.error('Ошибка обновления профиля:', e);
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const currentUser = await User.findById(req.user.userId);

        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (currentUser.avatarKey) {
            try {
                await deleteFromS3(currentUser.avatarKey);
            } catch (e) {
                console.error('Ошибка удаления старого аватара:', e);
            }
        }

        const result = await uploadToS3(req.file, 'avatars');

        await User.updateProfile(req.user.userId, {
            avatarUrl: result.url,
            avatarKey: result.key
        });

        res.json({
            success: true,
            avatarUrl: result.url,
            avatarKey: result.key
        });
    } catch (e) {
        console.error('Ошибка загрузки аватара:', e);
        res.status(500).json({ success: false, message: 'Ошибка загрузки' });
    }
};