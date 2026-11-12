require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../config/database');

const createAdmin = async () => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 8) {
        console.error('Задайте ADMIN_EMAIL и ADMIN_PASSWORD (минимум 8 символов) в .env');
        process.exitCode = 1;
        return;
    }

    const existing = await User.findByEmail(email);
    if (existing) {
        console.error('Пользователь с таким email уже есть');
        process.exitCode = 1;
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
        userEmail: email,
        userPassword: hashedPassword,
        userFirstName: 'Администратор',
        userLastName: 'Симба',
        userPhone: null,
        role: 'admin',
        doctorStatus: null,
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
    });

    console.log('Администратор создан. Входите обычным email и паролем.');
};

createAdmin()
    .catch((error) => {
        console.error('Не удалось создать администратора');
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.pool.end();
    });
