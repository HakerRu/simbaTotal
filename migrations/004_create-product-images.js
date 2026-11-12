exports.up = pgm => {
    pgm.createTable('product_images', {
        imageId: { type: 'bigserial', primaryKey: true },
        productId: { type: 'bigint', notNull: true, references: 'products', onDelete: 'CASCADE', comment: 'ID товара' },
        imageUrl: { type: 'varchar(500)', notNull: true, comment: 'URL изображения' },
        imageKey: { type: 'varchar(500)', comment: 'Ключ файла' },
        isMain: { type: 'boolean', notNull: true, defaultValue: false, comment: 'Главное фото' },
        sortOrder: { type: 'integer', defaultValue: 0, comment: 'Порядок' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Фотографии товаров' });

    pgm.createIndex('product_images', 'productId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('product_images', { ifExists: true });
};