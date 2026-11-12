const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId, handleValidationErrors } = require('../middleware/validate');
const { productValidator, orderValidator, categoryValidator } = require('../utils/validators');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/products', shopController.getProducts);
router.get('/products/:id', validateId('id'), optionalAuth, shopController.getProduct);
router.post('/products', ...staff, productValidator, handleValidationErrors, shopController.createProduct);
router.put('/products/:id', ...staff, validateId('id'), shopController.updateProduct);
router.delete('/products/:id', ...staff, validateId('id'), shopController.deleteProduct);
router.post('/products/:id/images', ...staff, validateId('id'), shopController.addProductImages);
router.delete('/products/:id/images', ...staff, validateId('id'), shopController.deleteProductImages);

router.get('/categories', shopController.getCategories);
router.post('/categories', ...staff, categoryValidator, handleValidationErrors, shopController.createCategory);
router.put('/categories/:id', ...staff, validateId('id'), categoryValidator, handleValidationErrors, shopController.updateCategory);
router.delete('/categories/:id', ...staff, validateId('id'), shopController.deleteCategory);

router.get('/cart', isAuthenticated, shopController.getCart);
router.get('/cart/count', isAuthenticated, shopController.getCartCount);
router.post('/cart/add', isAuthenticated, shopController.addToCart);
router.put('/cart/:productId', isAuthenticated, validateId('productId'), shopController.updateCartItem);
router.delete('/cart/:productId', isAuthenticated, validateId('productId'), shopController.removeFromCart);
router.delete('/cart', isAuthenticated, shopController.clearCart);

router.post('/orders', isAuthenticated, orderValidator, handleValidationErrors, shopController.createOrder);
router.get('/orders', isAuthenticated, shopController.getMyOrders);
router.get('/orders/all', ...staff, shopController.getAllOrders);
router.get('/orders/slots', shopController.getSlotsByDate);
router.get('/orders/check-slot', shopController.checkSlot);
router.get('/orders/:id', isAuthenticated, validateId('id'), shopController.getOrder);
router.put('/orders/:id/status', ...staff, validateId('id'), shopController.updateOrderStatus);
router.delete('/orders/:id', ...staff, validateId('id'), shopController.deleteOrder);

module.exports = router;
