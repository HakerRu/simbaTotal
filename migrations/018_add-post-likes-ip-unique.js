exports.up = pgm => {
    pgm.createIndex('post_likes', ['postId', 'ipAddress'], {
        name: 'unique_anon_ip_post',
        unique: true,
        where: '"userId" IS NULL',
        ifNotExists: true
    });
};

exports.down = pgm => {
    pgm.dropIndex('post_likes', ['postId', 'ipAddress'], {
        name: 'unique_anon_ip_post',
        ifExists: true
    });
};
