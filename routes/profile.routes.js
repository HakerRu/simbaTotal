const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const upload = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth');

router.put('/', isAuthenticated, profileController.updateProfile);
router.post('/avatar', isAuthenticated, upload.single('avatar'), profileController.uploadAvatar);

module.exports = router;