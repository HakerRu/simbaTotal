const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId, handleValidationErrors } = require('../middleware/validate');
const { postValidator } = require('../utils/validators');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', optionalAuth, blogController.getPosts);
router.get('/admin/all', ...staff, blogController.getAllPostsAdmin);
router.get('/:id', validateId('id'), optionalAuth, blogController.getPost);
router.post('/', ...staff, postValidator, handleValidationErrors, blogController.createPost);
router.put('/:id', ...staff, validateId('id'), blogController.updatePost);
router.delete('/:id', ...staff, validateId('id'), blogController.deletePost);
router.post('/:id/like', validateId('id'), optionalAuth, blogController.toggleLike);

module.exports = router;
