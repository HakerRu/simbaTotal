const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { uniqueSlug, generateOrderNumber } = require('../utils/helpers');
const { deleteManyFromS3 } = require('../utils/s3');

const ALLOWED_ORDER_STATUSES = new Set(['pending', 'ready', 'paid', 'cancelled']);
const isStaff = (req) => Boolean(req.user && (req.user.role === 'admin' || req.user.role === 'manager'));

const invalidNumber = (value) => {
    const n = Number(value);
    return !Number.isFinite(n) || n < 0;
};

// ==================== ТОВАРЫ ====================
exports.getProducts = async (req, res) => {
    try {
        const { category = 'all', sort = 'default', search = '' } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 9));
        const products = await Product.getAll({ category, sort, search, page, limit });
        const total = await Product.getTotal({ category, search });

        res.json({ success: true, products, total });
    } catch (e) {
        console.error('Ошибка загрузки товаров:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.getById(req.params.id, { activeOnly: !isStaff(req) });
        if (!product) return res.status(404).json({ success: false, message: 'Товар не найден' });
        res.json({ success: true, product });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const stockQuantity = Number(req.body.stockQuantity);
        const discount = req.body.productDiscountPrice;
        if (!req.body.productName || invalidNumber(req.body.productPrice) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Проверьте название, цену и количество' });
        }
        if (discount !== undefined && discount !== null && discount !== '' && (invalidNumber(discount) || Number(discount) > Number(req.body.productPrice))) {
            return res.status(400).json({ success: false, message: 'Некорректная скидка' });
        }

        const product = await Product.create({
            productName: req.body.productName,
            productSlug: uniqueSlug(req.body.productName, 'product'),
            productDescription: req.body.productDescription,
            productPrice: Number(req.body.productPrice),
            productDiscountPrice: discount === '' || discount === undefined ? null : discount,
            stockQuantity,
            categoryId: req.body.categoryId || null
        });

        if (req.body.images && req.body.images.length > 0) {
            await Product.addImages(product.productId, req.body.images);
        }

        res.status(201).json({ success: true, product });
    } catch (e) {
        console.error('Ошибка создания товара:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};
exports.updateProduct = async (req, res) => {
    try {
        if (req.body.productPrice !== undefined && invalidNumber(req.body.productPrice)) {
            return res.status(400).json({ success: false, message: 'Некорректная цена' });
        }
        if (req.body.stockQuantity !== undefined && (!Number.isInteger(Number(req.body.stockQuantity)) || Number(req.body.stockQuantity) < 0)) {
            return res.status(400).json({ success: false, message: 'Некорректное количество' });
        }
        if (req.body.productDiscountPrice !== undefined && req.body.productDiscountPrice !== null && req.body.productDiscountPrice !== '' && invalidNumber(req.body.productDiscountPrice)) {
            return res.status(400).json({ success: false, message: 'Некорректная скидка' });
        }

        let oldKeys = [];
        if (req.body.images !== undefined) {
            oldKeys = await Product.getImageKeys(req.params.id);
        }

        const product = await Product.update(req.params.id, req.body);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Товар не найден' });
        }

        if (req.body.images !== undefined) {
            await Product.deleteImages(req.params.id);
            if (req.body.images.length > 0) {
                await Product.addImages(req.params.id, req.body.images);
            }
            const newKeys = new Set((req.body.images || []).map((img) => img.key).filter(Boolean));
            await deleteManyFromS3(oldKeys.filter((k) => !newKeys.has(k)));
        }

        res.json({ success: true, product });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const keys = await Product.getImageKeys(req.params.id);
        await Product.delete(req.params.id);
        await deleteManyFromS3(keys);
        res.json({ success: true, message: 'Товар удалён' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};


exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create({
            categoryName: req.body.categoryName,
            categorySlug: uniqueSlug(req.body.categoryName, 'cat'),
            categoryDescription: req.body.categoryDescription,
            parentId: req.body.parentId || null
        });
        res.status(201).json({ success: true, category });
    } catch (e) {
        console.error('Ошибка создания категории:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.update(req.params.id, {
            categoryName: req.body.categoryName,
            categorySlug: uniqueSlug(req.body.categoryName, 'cat'),
            categoryDescription: req.body.categoryDescription,
            parentId: req.body.parentId || null
        });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Категория не найдена' });
        }
        res.json({ success: true, category });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.delete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};



exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.getTree();
        res.json({ success: true, categories });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

// ==================== КОРЗИНА ====================
exports.getCart = async (req, res) => {
    try {
        const items = await Cart.getItems(req.user.userId);
        const count = await Cart.getCount(req.user.userId);
        res.json({ success: true, items, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getCartCount = async (req, res) => {
    try {
        const count = await Cart.getCount(req.user.userId);
        res.json({ success: true, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const quantity = parseInt(req.body.quantity ?? 1, 10);
        const productId = req.body.productId;
        if (!productId || !/^\d+$/.test(String(productId)) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            return res.status(400).json({ success: false, message: 'Некорректное количество' });
        }

        const product = await Product.getById(productId, { activeOnly: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Товар не найден' });
        }

        const existing = await Cart.getItem(req.user.userId, productId);
        const desiredTotal = (existing?.quantity || 0) + quantity;
        if (desiredTotal > product.stockQuantity) {
            return res.status(400).json({ success: false, message: `Доступно на складе: ${product.stockQuantity} шт.` });
        }

        const item = await Cart.addItem(req.user.userId, productId, quantity);
        const count = await Cart.getCount(req.user.userId);
        res.json({ success: true, item, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка добавления' });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const quantity = parseInt(req.body.quantity, 10);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            return res.status(400).json({ success: false, message: 'Некорректное количество' });
        }

        const product = await Product.getById(req.params.productId, { activeOnly: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Товар не найден' });
        }
        if (quantity > product.stockQuantity) {
            return res.status(400).json({ success: false, message: `Доступно на складе: ${product.stockQuantity} шт.` });
        }

        const item = await Cart.updateQuantity(req.user.userId, req.params.productId, quantity);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Товар не найден в корзине' });
        }
        const count = await Cart.getCount(req.user.userId);
        res.json({ success: true, item, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        await Cart.removeItem(req.user.userId, req.params.productId);
        const count = await Cart.getCount(req.user.userId);
        res.json({ success: true, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await Cart.clear(req.user.userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

// ==================== ЗАКАЗЫ ====================
const ALLOWED_PICKUP_ADDRESSES = [
    'г. Нижний Тагил, Ленинградский пр-т, 20',
    'г. Нижний Тагил, ул. Носова, 1'
];

exports.ALLOWED_PICKUP_ADDRESSES = ALLOWED_PICKUP_ADDRESSES;

exports.createOrder = async (req, res) => {
    try {
        const { customerName, customerPhone, pickupAddress, pickupDate, pickupTime, orderNotes } = req.body;

        if (!customerName || !customerPhone || !pickupAddress || !pickupDate || !pickupTime) {
            return res.status(400).json({ success: false, message: 'Заполните все поля' });
        }

        if (!ALLOWED_PICKUP_ADDRESSES.includes(pickupAddress)) {
            return res.status(400).json({ success: false, message: 'Выберите корректный адрес самовывоза' });
        }

        const todayLocal = new Date().toLocaleDateString('en-CA');
        if (pickupDate < todayLocal) {
            return res.status(400).json({ success: false, message: 'Дата самовывоза не может быть в прошлом' });
        }

        const orderNumber = generateOrderNumber();

        const order = await Order.create({
            orderNumber,
            userId: req.user.userId,
            customerName,
            customerPhone,
            pickupAddress,
            pickupDate,
            pickupTime,
            orderNotes
        });

        res.status(201).json({ success: true, order });
    } catch (e) {
        if (e instanceof Order.HttpError) {
            return res.status(e.status).json({ success: false, message: e.message });
        }
        console.error('Ошибка создания заказа:', e);
        res.status(500).json({ success: false, message: 'Ошибка создания заказа' });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.getByUser(req.user.userId);
        res.json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const order = await Order.getById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Заказ не найден' });

        if (String(order.userId) !== String(req.user.userId) && req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ success: false, message: 'Доступ запрещён' });
        }

        res.json({ success: true, order });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.getAll({ status: req.query.status });
        res.json({ success: true, orders, total: orders.length });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        if (!ALLOWED_ORDER_STATUSES.has(orderStatus)) {
            return res.status(400).json({ success: false, message: 'Недопустимый статус заказа' });
        }

        const order = await Order.updateStatus(req.params.id, orderStatus);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }
        res.json({ success: true, order });
    } catch (e) {
        if (e instanceof Order.HttpError) {
            return res.status(e.status).json({ success: false, message: e.message });
        }
        res.status(500).json({ success: false, message: 'Ошибка обновления' });
    }
};

exports.addProductImages = async (req, res) => {
    try {
        const { images } = req.body;
        if (!images || images.length === 0) {
            return res.status(400).json({ success: false, message: 'Фото не переданы' });
        }
        await Product.addImages(req.params.id, images);
        res.json({ success: true, message: 'Фото добавлены' });
    } catch (e) {
        console.error('Ошибка добавления фото:', e);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};

exports.deleteProductImages = async (req, res) => {
    try {
        const keys = await Product.getImageKeys(req.params.id);
        await Product.deleteImages(req.params.id);
        await deleteManyFromS3(keys);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};
exports.deleteOrder = async (req, res) => {
    try {
        await Order.delete(req.params.id);
        res.json({ success: true, message: 'Заказ удалён' });
    } catch (e) {
        console.error('Ошибка удаления заказа:', e);
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
};
exports.checkSlot = async (req, res) => {
    try {
        const { date, time } = req.query;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(time))) {
            return res.status(400).json({ success: false, message: 'Некорректная дата или время' });
        }
        const count = await Order.countBySlot(date, time);
        res.json({ success: true, available: count < 4, count });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};
exports.getSlotsByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
            return res.status(400).json({ success: false, message: 'Некорректная дата' });
        }
        const slots = await Order.countSlotsByDate(date);
        res.json({ success: true, slots, maxPerSlot: 4 });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
};