const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId } = require('../middleware/validate');

router.use(isAuthenticated, requireRole('admin', 'manager'));
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id', validateId('id'), adminController.updateUserStatus);
router.get('/doctors/pending', adminController.getPendingDoctors);

module.exports = router;