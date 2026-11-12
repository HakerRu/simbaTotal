const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const upload = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth');

router.post('/file', isAuthenticated, upload.single('file'), uploadController.uploadFile);
router.post('/multiple', isAuthenticated, upload.array('files', 10), uploadController.uploadMultiple);
router.delete('/file', isAuthenticated, uploadController.deleteFile);

module.exports = router;