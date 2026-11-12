exports.up = pgm => {
    pgm.createTable('gallery_albums', {
        albumId: { type: 'bigserial', primaryKey: true },
        albumName: { type: 'varchar(255)', notNull: true, comment: 'Название альбома' },
        albumSlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        albumDescription: { type: 'text', comment: 'Описание' },
        coverImageUrl: { type: 'varchar(500)', comment: 'Обложка альбома' },
        coverImageKey: { type: 'varchar(500)', comment: 'Ключ обложки' },
        isPublished: { type: 'boolean', notNull: true, defaultValue: true },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Альбомы галереи' });
};

exports.down = pgm => {
    pgm.dropTable('gallery_albums', { ifExists: true });
};