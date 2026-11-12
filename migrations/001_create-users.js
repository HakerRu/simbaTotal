exports.up = pgm => {
    pgm.createTable('users', {
        userId: { type: 'bigserial', primaryKey: true },
        userEmail: { type: 'varchar(255)', unique: true, notNull: true, comment: 'Email пользователя' },
        userPhone: { type: 'varchar(20)', unique: true, comment: 'Телефон' },
        userPassword: { type: 'varchar(255)', notNull: true, comment: 'Хэш пароля' },
        userFirstName: { type: 'varchar(100)', notNull: true, comment: 'Имя' },
        userLastName: { type: 'varchar(100)', notNull: true, comment: 'Фамилия' },
        avatarUrl: { type: 'varchar(500)', comment: 'URL аватарки' },
        avatarKey: { type: 'varchar(500)', comment: 'Ключ файла' },
        role: { type: 'varchar(50)', notNull: true, default: 'client', comment: 'Роль: admin, manager, doctor, client' },
        doctorStatus: { type: 'varchar(50)', comment: 'Статус врача: pending, approved, rejected' },
        doctorSpecialization: { type: 'varchar(255)', comment: 'Специализация врача' },
        doctorDescription: { type: 'text', comment: 'Описание врача' },
        doctorExperienceYears: { type: 'integer', default: 0, comment: 'Стаж врача (лет)' },
        doctorEducation: { type: 'text', comment: 'Образование врача' },
        vkLink: { type: 'varchar(500)', comment: 'Ссылка VK' },
        telegramLink: { type: 'varchar(500)', comment: 'Ссылка Telegram' },
        isActive: { type: 'boolean', notNull: true, default: true, comment: 'Активен ли пользователь' },
        isEmailVerified: { type: 'boolean', notNull: true, default: false, comment: 'Email подтверждён' },
        emailVerificationToken: { type: 'varchar(255)', comment: 'Токен подтверждения email' },
        emailVerificationExpires: { type: 'timestamp with time zone', comment: 'Истечение токена подтверждения' },
        lastLogin: { type: 'timestamp with time zone', comment: 'Последний вход' },
        refreshToken: { type: 'text', comment: 'Refresh токен' },
        refreshTokenExpires: { type: 'timestamp with time zone', comment: 'Истечение refresh токена' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()'), comment: 'Дата создания' },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()'), comment: 'Дата обновления' }
    }, { ifNotExists: true, comment: 'Пользователи системы' });

    pgm.createIndex('users', 'userEmail', { ifNotExists: true });
    pgm.createIndex('users', 'userPhone', { ifNotExists: true });
    pgm.createIndex('users', 'role', { ifNotExists: true });
    pgm.createIndex('users', 'isActive', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('users', { ifExists: true });
};