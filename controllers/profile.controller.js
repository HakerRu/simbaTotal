const User = require('../models/User');
const { uploadToS3, deleteFromS3 } = require('../utils/s3');

exports.updateProfile = async (req, res) => {
    try {
        // Хардкод-админ — заглушка
        if (req.user.userId === 0) {
            return res.json({
                success: true,
                user: {
                    userId: 0,
                    userEmail: 'admin',
                    userFirstName: req.body.userFirstName || 'Администратор',
                    userLastName: req.body.userLastName || 'Симба',
                    userPhone: req.body.userPhone || null,
                    role: 'admin',
                    isEmailVerified: true
                }
            });
        }

        const updateData = {
            userFirstName: req.body.userFirstName,
            userLastName: req.body.userLastName,
            userPhone: req.body.userPhone,
            // ... остальные поля
        };

        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

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

        // Хардкод-админ — просто загружаем без сохранения в БД
        if (req.user.userId === 0) {
            const result = await uploadToS3(req.file, 'avatars');
            return res.json({
                success: true,
                avatarUrl: result.url,
                avatarKey: result.key
            });
        }

        // Обычный юзер
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
        res.status(500).json({ success: false, message: 'Ошибка загрузки: ' + e.message });
    }
};