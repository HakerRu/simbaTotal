const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', blogController.getPosts);
router.get('/admin/all', isAuthenticated, blogController.getAllPostsAdmin);
router.get('/:id', blogController.getPost);
router.post('/', isAuthenticated, blogController.createPost);
router.put('/:id', isAuthenticated, blogController.updatePost);
router.delete('/:id', isAuthenticated, blogController.deletePost);
router.post('/:id/like', blogController.toggleLike);
module.exports = router;