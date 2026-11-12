exports.up = pgm => {
    pgm.createTable('cart_items', {
        cartId: { type: 'bigserial', primaryKey: true },
        userId: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE', comment: 'Пользователь' },
        productId: { type: 'bigint', notNull: true, references: 'products', onDelete: 'CASCADE', comment: 'Товар' },
        quantity: { type: 'integer', notNull: true, defaultValue: 1, comment: 'Количество' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Корзина пользователей' });

    pgm.addConstraint('cart_items', 'unique_user_product', { unique: ['userId', 'productId'] });
};

exports.down = pgm => {
    pgm.dropTable('cart_items', { ifExists: true });
};