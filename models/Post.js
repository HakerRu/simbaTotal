const db = require('../database/db');

class Post {
    static async getAll({ type = 'all', page = 1, limit = 9, publishedOnly = true } = {}) {
        let query = `SELECT p.*, 
                 u."userFirstName" as "authorFirstName", u."userLastName" as "authorLastName",
                 (SELECT json_agg(pm ORDER BY pm."sortOrder") FROM post_media pm WHERE pm."postId" = p."postId") as media
                 FROM posts p
                 LEFT JOIN users u ON p."authorId" = u."userId"
                 WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (publishedOnly) {
            query += ` AND p."isPublished" = true`;
        }

        if (type && type !== 'all') {
            paramCount++;
            query += ` AND p."postType" = $${paramCount}`;
            values.push(type);
        }

        query += ` ORDER BY p."createDate" DESC`;

        if (limit) {
            const offset = ((page || 1) - 1) * limit;

            paramCount++;
            query += ` LIMIT $${paramCount}::int`;
            values.push(parseInt(limit));

            paramCount++;
            query += ` OFFSET $${paramCount}::int`;
            values.push(parseInt(offset));
        }

        const result = await db.query(query, values);
        return result.rows;
    }
    static async getTotal({ type = 'all', publishedOnly = true } = {}) {
        let query = `SELECT COUNT(*) as total FROM posts WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (publishedOnly) {
            query += ` AND "isPublished" = true`;
        }

        if (type && type !== 'all') {
            paramCount++;
            query += ` AND "postType" = $${paramCount}`;
            values.push(type);
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].total);
    }
    static async getById(postId, { publishedOnly = true } = {}) {
        let query = `SELECT p.*, 
             u."userFirstName" as "authorFirstName", u."userLastName" as "authorLastName"
             FROM posts p
             LEFT JOIN users u ON p."authorId" = u."userId"
             WHERE p."postId" = $1`;
        if (publishedOnly) {
            query += ` AND p."isPublished" = true`;
        }
        const result = await db.query(query, [postId]);

        if (!result.rows[0]) return null;

        const post = result.rows[0];
        const mediaResult = await db.query(
            'SELECT * FROM post_media WHERE "postId" = $1 ORDER BY "sortOrder"',
            [postId]
        );
        post.media = mediaResult.rows;
        return post;
    }

    static async toggleLike(postId, userId, ip) {
        let existing;
        if (userId) {
            existing = await db.query(
                'SELECT * FROM post_likes WHERE "postId" = $1 AND "userId" = $2',
                [postId, userId]
            );
        } else {
            existing = await db.query(
                'SELECT * FROM post_likes WHERE "postId" = $1 AND "userId" IS NULL AND "ipAddress" = $2',
                [postId, ip]
            );
        }

        if (existing.rows.length > 0) {
            if (userId) {
                await db.query('DELETE FROM post_likes WHERE "postId" = $1 AND "userId" = $2', [postId, userId]);
            } else {
                await db.query('DELETE FROM post_likes WHERE "postId" = $1 AND "userId" IS NULL AND "ipAddress" = $2', [postId, ip]);
            }
            return { liked: false };
        } else {
            await db.query(
                'INSERT INTO post_likes ("postId", "userId", "ipAddress") VALUES ($1, $2, $3)',
                [postId, userId || null, ip]
            );
            return { liked: true };
        }
    }

    static async getLikesCount(postId) {
        const result = await db.query(
            'SELECT COUNT(*)::int as count FROM post_likes WHERE "postId" = $1',
            [postId]
        );
        return result.rows[0].count;
    }

    static async getLikesCounts(postIds) {
        if (!postIds || postIds.length === 0) return {};
        const result = await db.query(
            'SELECT "postId", COUNT(*)::int as count FROM post_likes WHERE "postId" = ANY($1) GROUP BY "postId"',
            [postIds]
        );
        const counts = {};
        for (const row of result.rows) {
            counts[row.postId] = row.count;
        }
        return counts;
    }

    static async getLikedPostIds(userId, ip, postIds) {
        if (postIds.length === 0) return [];

        let result;
        if (userId) {
            result = await db.query(
                'SELECT "postId" FROM post_likes WHERE "userId" = $1 AND "postId" = ANY($2)',
                [userId, postIds]
            );
        } else {
            result = await db.query(
                'SELECT "postId" FROM post_likes WHERE "userId" IS NULL AND "ipAddress" = $1 AND "postId" = ANY($2)',
                [ip, postIds]
            );
        }
        return result.rows.map(r => r.postId);
    }
    static async create({ postTitle, postSlug, postContent, postType, authorId, isPublished, media }) {
        if (!postSlug || postSlug.trim() === '') {
            postSlug = 'post-' + Date.now();
        }

        const result = await db.query(
            `INSERT INTO posts ("postTitle", "postSlug", "postContent", "postType", "authorId", "isPublished", "postViews")
         VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *`,
            [postTitle, postSlug, postContent, postType || 'article', authorId || null, isPublished || false]
        );

        const post = result.rows[0];

        if (media && media.length > 0) {
            for (let i = 0; i < media.length; i++) {
                await db.query(
                    `INSERT INTO post_media ("postId", "mediaType", "mediaUrl", "mediaKey", "sortOrder")
                 VALUES ($1, $2, $3, $4, $5)`,
                    [post.postId, media[i].type || 'image', media[i].url, media[i].key || null, i]
                );
            }
        }

        return post;
    }

    static async update(postId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = ['postTitle', 'postSlug', 'postContent', 'postType', 'isPublished'];
        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`"${key}" = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length > 0) {
            paramCount++;
            updates.push(`"updateDate" = NOW()`);
            values.push(postId);
            await db.query(`UPDATE posts SET ${updates.join(', ')} WHERE "postId" = $${paramCount}`, values);
        }

        // Обновление медиа
        if (data.media !== undefined) {
            await db.query('DELETE FROM post_media WHERE "postId" = $1', [postId]);
            if (data.media.length > 0) {
                for (let i = 0; i < data.media.length; i++) {
                    await db.query(
                        `INSERT INTO post_media ("postId", "mediaType", "mediaUrl", "mediaKey", "sortOrder")
                         VALUES ($1, $2, $3, $4, $5)`,
                        [postId, data.media[i].type || 'image', data.media[i].url, data.media[i].key || null, i]
                    );
                }
            }
        }

        return await this.getById(postId);
    }

    static async getMediaKeys(postId) {
        const result = await db.query('SELECT "mediaKey" FROM post_media WHERE "postId" = $1 AND "mediaKey" IS NOT NULL', [postId]);
        return result.rows.map((r) => r.mediaKey);
    }

    static async delete(postId) {
        await db.query('DELETE FROM post_media WHERE "postId" = $1', [postId]);
        await db.query('DELETE FROM posts WHERE "postId" = $1', [postId]);
    }

    static async incrementViews(postId) {
        await db.query('UPDATE posts SET "postViews" = "postViews" + 1 WHERE "postId" = $1', [postId]);
    }
}

module.exports = Post;