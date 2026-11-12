exports.up = pgm => {
    pgm.createTable('products', {
        productId: { type: 'bigserial', primaryKey: true },
        productName: { type: 'varchar(255)', notNull: true, comment: 'Название товара' },
        productSlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        productDescription: { type: 'text', comment: 'Описание товара' },
        productPrice: { type: 'decimal(10,2)', notNull: true, comment: 'Цена' },
        productDiscountPrice: { type: 'decimal(10,2)', comment: 'Цена со скидкой' },
        stockQuantity: { type: 'integer', notNull: true, defaultValue: 0, comment: 'Количество на складе' },
        categoryId: { type: 'bigint', references: 'product_categories', onDelete: 'SET NULL', comment: 'Категория товара' },
        isActive: { type: 'boolean', notNull: true, defaultValue: true, comment: 'Товар активен' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Товары магазина' });

    pgm.createIndex('products', 'categoryId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('products', { ifExists: true });
};