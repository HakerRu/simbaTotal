const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/products', shopController.getProducts);
router.get('/products/:id', shopController.getProduct);
router.post('/products', ...staff, shopController.createProduct);
router.put('/products/:id', ...staff, shopController.updateProduct);
router.delete('/products/:id', ...staff, shopController.deleteProduct);
router.post('/products/:id/images', ...staff, shopController.addProductImages);
router.delete('/products/:id/images', ...staff, shopController.deleteProductImages);

router.get('/categories', shopController.getCategories);
router.post('/categories', ...staff, shopController.createCategory);
router.put('/categories/:id', ...staff, shopController.updateCategory);
router.delete('/categories/:id', ...staff, shopController.deleteCategory);

router.get('/cart', isAuthenticated, shopController.getCart);
router.get('/cart/count', isAuthenticated, shopController.getCartCount);
router.post('/cart/add', isAuthenticated, shopController.addToCart);
router.put('/cart/:productId', isAuthenticated, shopController.updateCartItem);
router.delete('/cart/:productId', isAuthenticated, shopController.removeFromCart);
router.delete('/cart', isAuthenticated, shopController.clearCart);

router.post('/orders', isAuthenticated, shopController.createOrder);
router.get('/orders', isAuthenticated, shopController.getMyOrders);
router.get('/orders/all', ...staff, shopController.getAllOrders);
router.get('/orders/check-slot', shopController.checkSlot);
router.get('/orders/:id', isAuthenticated, shopController.getOrder);
router.put('/orders/:id/status', ...staff, shopController.updateOrderStatus);
router.delete('/orders/:id', ...staff, shopController.deleteOrder);

module.exports = router;
