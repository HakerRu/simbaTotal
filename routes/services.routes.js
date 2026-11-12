const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId, handleValidationErrors } = require('../middleware/validate');
const { categoryValidator } = require('../utils/validators');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', servicesController.getServices);
router.get('/categories', servicesController.getCategories);
router.get('/:id', validateId('id'), optionalAuth, servicesController.getService);

router.post('/', ...staff, servicesController.createService);
router.put('/:id', ...staff, validateId('id'), servicesController.updateService);
router.delete('/:id', ...staff, validateId('id'), servicesController.deleteService);

router.post('/categories', ...staff, categoryValidator, handleValidationErrors, servicesController.createCategory);
router.put('/categories/:id', ...staff, validateId('id'), categoryValidator, handleValidationErrors, servicesController.updateCategory);
router.delete('/categories/:id', ...staff, validateId('id'), servicesController.deleteCategory);

module.exports = router;
