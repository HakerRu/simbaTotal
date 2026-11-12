exports.up = pgm => {
    pgm.createTable('orders', {
        orderId: { type: 'bigserial', primaryKey: true },
        orderNumber: { type: 'varchar(20)', unique: true, notNull: true, comment: 'Уникальный номер заказа (SB-ГГГГММ-XXXX)' },
        userId: { type: 'bigint', references: 'users', onDelete: 'SET NULL', comment: 'Пользователь (если авторизован)' },
        customerName: { type: 'varchar(255)', notNull: true, comment: 'Имя клиента' },
        customerPhone: { type: 'varchar(20)', notNull: true, comment: 'Телефон клиента' },
        pickupDate: { type: 'date', notNull: true, comment: 'Дата самовывоза' },
        pickupTime: { type: 'time', notNull: true, comment: 'Время самовывоза' },
        orderStatus: { type: 'varchar(50)', notNull: true, defaultValue: 'pending', comment: 'Статус: pending, ready, paid, cancelled' },
        totalAmount: { type: 'decimal(10,2)', notNull: true, comment: 'Сумма заказа' },
        orderNotes: { type: 'text', comment: 'Примечания' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Заказы' });

    pgm.createIndex('orders', 'pickupDate', { ifNotExists: true });
    pgm.createIndex('orders', 'userId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('orders', { ifExists: true });
};