const express = require('express');
const router = express.Router();
const doctorsController = require('../controllers/doctors.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/', doctorsController.getAllDoctors);
router.get('/:id', doctorsController.getDoctorById);
router.put('/me/profile', isAuthenticated, requireRole('doctor'), doctorsController.updateMyProfile);

module.exports = router;