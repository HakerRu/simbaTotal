const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const upload = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.post('/file', ...staff, upload.single('file'), uploadController.uploadFile);
router.post('/multiple', ...staff, upload.array('files', 10), uploadController.uploadMultiple);
router.delete('/file', ...staff, uploadController.deleteFile);

module.exports = router;
