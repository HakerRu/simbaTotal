exports.up = pgm => {
    pgm.createTable('posts', {
        postId: { type: 'bigserial', primaryKey: true },
        postTitle: { type: 'varchar(255)', notNull: true, comment: 'Заголовок' },
        postSlug: { type: 'varchar(255)', unique: true, notNull: true, comment: 'URL-slug' },
        postContent: { type: 'text', comment: 'Содержание' },
        postType: { type: 'varchar(50)', notNull: true, defaultValue: 'article', comment: 'Тип: article, reel' },
        postViews: { type: 'integer', notNull: true, defaultValue: 0, comment: 'Счётчик просмотров' },
        isPublished: { type: 'boolean', notNull: true, defaultValue: false, comment: 'Опубликован' },
        authorId: { type: 'bigint', references: 'users', onDelete: 'SET NULL', comment: 'Автор' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
        updateDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true, comment: 'Посты блога (инфостенд)' });

    pgm.createIndex('posts', 'isPublished', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('posts', { ifExists: true });
};