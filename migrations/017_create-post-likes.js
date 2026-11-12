exports.up = pgm => {
    pgm.createTable('post_likes', {
        likeId: { type: 'bigserial', primaryKey: true },
        postId: { type: 'bigint', notNull: true, references: 'posts', onDelete: 'CASCADE' },
        userId: { type: 'bigint', references: 'users', onDelete: 'CASCADE' },
        ipAddress: { type: 'varchar(50)', comment: 'Для неавторизованных' },
        createDate: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') }
    }, { ifNotExists: true });

    pgm.addConstraint('post_likes', 'unique_user_post', { unique: ['userId', 'postId'] });
    pgm.createIndex('post_likes', 'postId', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('post_likes', { ifExists: true });
};