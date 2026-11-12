const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', blogController.getPosts);
router.get('/admin/all', ...staff, blogController.getAllPostsAdmin);
router.get('/:id', blogController.getPost);
router.post('/', ...staff, blogController.createPost);
router.put('/:id', ...staff, blogController.updatePost);
router.delete('/:id', ...staff, blogController.deletePost);
router.post('/:id/like', blogController.toggleLike);

module.exports = router;
