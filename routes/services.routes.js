const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', servicesController.getServices);
router.get('/categories', servicesController.getCategories);
router.get('/:id', servicesController.getService);

router.post('/', isAuthenticated, servicesController.createService);
router.put('/:id', isAuthenticated, servicesController.updateService);
router.delete('/:id', isAuthenticated, servicesController.deleteService);

router.post('/categories', isAuthenticated, servicesController.createCategory);
router.put('/categories/:id', isAuthenticated, servicesController.updateCategory);
router.delete('/categories/:id', isAuthenticated, servicesController.deleteCategory);

module.exports = router;