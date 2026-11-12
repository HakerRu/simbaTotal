const express = require('express');
const router = express.Router();
const doctorsController = require('../controllers/doctors.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId, handleValidationErrors } = require('../middleware/validate');
const { doctorProfileValidator } = require('../utils/validators');

router.get('/', doctorsController.getAllDoctors);
router.get('/:id', validateId('id'), doctorsController.getDoctorById);
router.put('/me/profile', isAuthenticated, requireRole('doctor'), doctorProfileValidator, handleValidationErrors, doctorsController.updateMyProfile);

module.exports = router;