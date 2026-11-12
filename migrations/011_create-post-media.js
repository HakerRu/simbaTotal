exports.up = pgm => {
    pgm.createTable('post_media', {
        mediaId: { type: 'bigserial', primaryKey: true },
        postId: { type: 'bigint', notNull: true, references: 'posts', onDelete: 'CASCADE', comment: 'Пост' },
        mediaType: { type: 'varchar(50)', notNull: true, comment: 'Тип: image, video, reel' },
        mediaUrl: { type: 'varchar(500)', notNull: true, comment: 'URL медиа' },
        mediaKey: { type: 'varchar(500)', comment: 'Ключ файла' },
        sortOrder: { type: 'integer', defaultValue: 0 },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Медиафайлы постов' });
};

exports.down = pgm => {
    pgm.dropTable('post_media', { ifExists: true });
};