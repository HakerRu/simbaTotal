const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const upload = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { doctorProfileValidator } = require('../utils/validators');

router.put('/', isAuthenticated, doctorProfileValidator, handleValidationErrors, profileController.updateProfile);
router.post('/avatar', isAuthenticated, upload.single('avatar'), profileController.uploadAvatar);

module.exports = router;