const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', servicesController.getServices);
router.get('/categories', servicesController.getCategories);
router.get('/:id', servicesController.getService);

router.post('/', ...staff, servicesController.createService);
router.put('/:id', ...staff, servicesController.updateService);
router.delete('/:id', ...staff, servicesController.deleteService);

router.post('/categories', ...staff, servicesController.createCategory);
router.put('/categories/:id', ...staff, servicesController.updateCategory);
router.delete('/categories/:id', ...staff, servicesController.deleteCategory);

module.exports = router;
