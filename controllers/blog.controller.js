const Post = require('../models/Post');
const { slugify } = require('../utils/helpers');

exports.getPosts = async (req, res) => {
    try {
        const { type = 'all', page = 1, limit = 9 } = req.query;
        const posts = await Post.getAll({ type, page: parseInt(page), limit: parseInt(limit) });
        const total = await Post.getTotal({ type });

        // Добавляем лайки
        const userId = req.user?.userId && req.user.userId !== 0 ? req.user.userId : null;
        const ip = req.ip || req.connection.remoteAddress;
        const postIds = posts.map(p => p.postId);

        const likedIds = await Post.getLikedPostIds(userId, ip, postIds);

        for (const post of posts) {
            post.likesCount = await Post.getLikesCount(post.postId);
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
        const post = await Post.getById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Пост не найден' });

        // Увеличиваем счётчик просмотров
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
        console.error('ОШИБКА getAllPostsAdmin:', e);  // ← добавь это
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};
exports.toggleLike = async (req, res) => {
    try {
        const userId = req.user?.userId && req.user.userId !== 0 ? req.user.userId : null;
        const ip = req.ip || req.connection.remoteAddress;

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
            postSlug: slugify(postTitle) + '-' + Date.now(),
            postContent,
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
        const post = await Post.update(req.params.id, req.body);
        res.json({ success: true, post });
    } catch (e) {
        console.error('Ошибка обновления поста:', e);
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        await Post.delete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};