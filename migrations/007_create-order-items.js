exports.up = pgm => {
    pgm.createTable('order_items', {
        orderItemId: { type: 'bigserial', primaryKey: true },
        orderId: { type: 'bigint', notNull: true, references: 'orders', onDelete: 'CASCADE', comment: 'Заказ' },
        productId: { type: 'bigint', references: 'products', onDelete: 'SET NULL', comment: 'Товар' },
        productName: { type: 'varchar(255)', notNull: true, comment: 'Название товара (на момент заказа)' },
        quantity: { type: 'integer', notNull: true, comment: 'Количество' },
        price: { type: 'decimal(10,2)', notNull: true, comment: 'Цена (на момент заказа)' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Позиции заказа' });
};

exports.down = pgm => {
    pgm.dropTable('order_items', { ifExists: true });
};