require('dotenv').config();
require('express-async-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const shopRoutes = require('./routes/shop.routes');
const servicesRoutes = require('./routes/services.routes');
const adminRoutes = require('./routes/admin.routes');
const doctorsRoutes = require('./routes/doctors.routes');
const profileRoutes = require('./routes/profile.routes');
const app = express();
const uploadRoutes = require('./routes/upload.routes');
const blogRoutes = require('./routes/blog.routes');
const certificatesRoutes = require('./routes/certificates.routes');

const galleryRoutes = require('./routes/gallery.routes');

app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: process.env.BASE_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ...
app.use('/api/upload', uploadRoutes);
// API роуты
app.use('/api/certificates', certificatesRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorsRoutes);

// ...
app.use('/api/blog', blogRoutes);
app.use('/api/profile', profileRoutes);
// HTML страницы
const pages = ['shop', 'services', 'blog', 'reels', 'schedule', 'doctors', 'doctor', 'service', 'product', 'cart', 'checkout', 'order-success', 'post', 'gallery', 'certificates', 'contacts', 'login', 'register', 'profile', 'admin'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
    app.get(`/${page}.html`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Ошибка сервера
app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Некорректный формат JSON' });
    }
    if (err?.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Файл слишком большой' : 'Ошибка загрузки файла';
        return res.status(400).json({ success: false, message: msg });
    }
    if (err?.message === 'Неподдерживаемый тип файла') {
        return res.status(400).json({ success: false, message: err.message });
    }
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    });
}

module.exports = app;