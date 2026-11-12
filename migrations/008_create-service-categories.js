exports.up = pgm => {
    pgm.createTable('service_categories', {
        categoryId: { type: 'bigserial', primaryKey: true },
        categoryName: { type: 'varchar(255)', notNull: true, comment: 'Название категории' },
        categorySlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        categoryDescription: { type: 'text', comment: 'Описание' },
        categoryImage: { type: 'varchar(500)', comment: 'Изображение' },
        isActive: { type: 'boolean', notNull: true, defaultValue: true },
        sortOrder: { type: 'integer', defaultValue: 0 },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Категории услуг' });
};

exports.down = pgm => {
    pgm.dropTable('service_categories', { ifExists: true });
};