exports.up = pgm => {
    pgm.createTable('services', {
        serviceId: { type: 'bigserial', primaryKey: true },
        serviceName: { type: 'varchar(255)', notNull: true, comment: 'Название услуги' },
        serviceSlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        serviceDescription: { type: 'text', comment: 'Описание услуги' },
        servicePrice: { type: 'decimal(10,2)', notNull: true, comment: 'Цена' },
        durationMinutes: { type: 'integer', notNull: true, defaultValue: 30, comment: 'Длительность приёма (минут)' },
        categoryId: { type: 'bigint', references: 'service_categories', onDelete: 'SET NULL', comment: 'Категория услуги' },
        isActive: { type: 'boolean', notNull: true, defaultValue: true },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Услуги клиники' });
};

exports.down = pgm => {
    pgm.dropTable('services', { ifExists: true });
};