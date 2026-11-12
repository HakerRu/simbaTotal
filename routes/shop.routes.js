const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const { isAuthenticated } = require('../middleware/auth');




// Категории
router.post('/categories', isAuthenticated, shopController.createCategory);
router.put('/categories/:id', isAuthenticated, shopController.updateCategory);
router.delete('/categories/:id', isAuthenticated, shopController.deleteCategory);




router.delete('/orders/:id', isAuthenticated, shopController.deleteOrder);
router.get('/products', shopController.getProducts);
router.get('/products/:id', shopController.getProduct);
router.post('/products', isAuthenticated, shopController.createProduct);
router.put('/products/:id', isAuthenticated, shopController.updateProduct);
router.delete('/products/:id', isAuthenticated, shopController.deleteProduct);
router.get('/orders/all', isAuthenticated, shopController.getAllOrders);
router.put('/orders/:id/status', isAuthenticated, shopController.updateOrderStatus);
router.get('/categories', shopController.getCategories);
// Заказы
router.post('/orders', isAuthenticated, shopController.createOrder);
router.get('/orders', isAuthenticated, shopController.getMyOrders);
router.get('/orders/all', isAuthenticated, shopController.getAllOrders);
router.get('/orders/check-slot', shopController.checkSlot);
router.get('/orders/:id', isAuthenticated, shopController.getOrder);
router.put('/orders/:id/status', isAuthenticated, shopController.updateOrderStatus);







router.post('/products/:id/images', isAuthenticated, shopController.addProductImages);
router.delete('/products/:id/images', isAuthenticated, shopController.deleteProductImages);

router.get('/cart', isAuthenticated, shopController.getCart);
router.get('/cart/count', isAuthenticated, shopController.getCartCount);
router.post('/cart/add', isAuthenticated, shopController.addToCart);
router.put('/cart/:productId', isAuthenticated, shopController.updateCartItem);
router.delete('/cart/:productId', isAuthenticated, shopController.removeFromCart);
router.delete('/cart', isAuthenticated, shopController.clearCart);

module.exports = router;