const Post = require('../models/Post');
const { uniqueSlug } = require('../utils/helpers');
const { deleteManyFromS3 } = require('../utils/s3');

const isStaff = (req) => Boolean(req.user && (req.user.role === 'admin' || req.user.role === 'manager'));

exports.getPosts = async (req, res) => {
    try {
        const { type = 'all' } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 9));
        const posts = await Post.getAll({ type, page, limit });
        const total = await Post.getTotal({ type });

        const userId = req.user?.userId || null;
        const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
        const postIds = posts.map(p => p.postId);

        const [likedIds, likesCounts] = await Promise.all([
            Post.getLikedPostIds(userId, ip, postIds),
            Post.getLikesCounts(postIds)
        ]);

        for (const post of posts) {
            post.likesCount = likesCounts[post.postId] || 0;
            post.isLiked = likedIds.includes(post.postId);
        }

        res.json({ success: true, posts, total });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

exports.getPost = async (req, res) => {
    try {
        const post = await Post.getById(req.params.id, { publishedOnly: !isStaff(req) });
        if (!post) return res.status(404).json({ success: false, message: 'Пост не найден' });

        await Post.incrementViews(req.params.id);
        post.postViews = (post.postViews || 0) + 1;

        res.json({ success: true, post });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getAllPostsAdmin = async (req, res) => {
    try {
        const posts = await Post.getAll({ publishedOnly: false, limit: 1000 });
        res.json({ success: true, posts, total: posts.length });
    } catch (e) {
        console.error('ОШИБКА getAllPostsAdmin:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const post = await Post.getById(req.params.id, { publishedOnly: true });
        if (!post) {
            return res.status(404).json({ success: false, message: 'Пост не найден' });
        }

        const userId = req.user?.userId || null;
        const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';

        const result = await Post.toggleLike(req.params.id, userId, ip);
        const count = await Post.getLikesCount(req.params.id);

        res.json({ success: true, liked: result.liked, count });
    } catch (e) {
        console.error('Ошибка лайка:', e);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const { postTitle, postContent, postType, isPublished, media } = req.body;

        if (!postTitle) {
            return res.status(400).json({ success: false, message: 'Заголовок обязателен' });
        }

        const post = await Post.create({
            postTitle,
            postSlug: uniqueSlug(postTitle, 'post'),
            postContent: postContent || '',
            postType: postType || 'article',
            authorId: req.user.userId,
            isPublished: isPublished !== undefined ? isPublished : false,
            media: media || []
        });

        res.status(201).json({ success: true, post });
    } catch (e) {
        console.error('Ошибка создания поста:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updatePost = async (req, res) => {
    try {
        let oldKeys = [];
        if (req.body.media !== undefined) {
            oldKeys = await Post.getMediaKeys(req.params.id);
        }

        const post = await Post.update(req.params.id, req.body);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Пост не найден' });
        }

        if (req.body.media !== undefined && oldKeys.length > 0) {
            const newKeys = new Set((req.body.media || []).map((m) => m.key).filter(Boolean));
            await deleteManyFromS3(oldKeys.filter((k) => !newKeys.has(k)));
        }

        res.json({ success: true, post });
    } catch (e) {
        console.error('Ошибка обновления поста:', e);
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const keys = await Post.getMediaKeys(req.params.id);
        await Post.delete(req.params.id);
        await deleteManyFromS3(keys);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};