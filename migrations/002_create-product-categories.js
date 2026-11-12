exports.up = pgm => {
    pgm.createTable('product_categories', {
        categoryId: { type: 'bigserial', primaryKey: true },
        categoryName: { type: 'varchar(255)', notNull: true, comment: 'Название категории' },
        categorySlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        categoryDescription: { type: 'text', comment: 'Описание категории' },
        categoryImage: { type: 'varchar(500)', comment: 'Изображение категории' },
        parentId: { type: 'bigint', references: 'product_categories', onDelete: 'SET NULL', comment: 'Родительская категория (бесконечная вложенность)' },
        isActive: { type: 'boolean', notNull: true, defaultValue: true, comment: 'Активна ли категория' },
        sortOrder: { type: 'integer', defaultValue: 0, comment: 'Порядок сортировки' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Категории товаров' });
};

exports.down = pgm => {
    pgm.dropTable('product_categories', { ifExists: true });
};