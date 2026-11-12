exports.up = pgm => {
    pgm.createTable('gallery_photos', {
        photoId: { type: 'bigserial', primaryKey: true },
        albumId: { type: 'bigint', notNull: true, references: 'gallery_albums', onDelete: 'CASCADE', comment: 'Альбом' },
        photoUrl: { type: 'varchar(500)', notNull: true, comment: 'URL фото' },
        photoKey: { type: 'varchar(500)', comment: 'Ключ файла' },
        photoCaption: { type: 'varchar(500)', comment: 'Подпись к фото' },
        sortOrder: { type: 'integer', defaultValue: 0 },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Фотографии галереи' });

    pgm.createIndex('gallery_photos', 'albumId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('gallery_photos', { ifExists: true });
};