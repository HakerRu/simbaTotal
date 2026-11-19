const db = require('../database/db');

exports.getSitemap = async (req, res) => {
    try {
        const baseUrl = process.env.BASE_SITE_URL || 'https://www.sim-simba.ru';

        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/services.html', priority: '0.9', changefreq: 'weekly' },
            { url: '/shop.html', priority: '0.9', changefreq: 'weekly' },
            { url: '/contacts.html', priority: '0.9', changefreq: 'monthly' },
            { url: '/doctors.html', priority: '0.8', changefreq: 'monthly' },
            { url: '/blog.html', priority: '0.8', changefreq: 'daily' },
            { url: '/reels.html', priority: '0.8', changefreq: 'daily' },
            { url: '/gallery.html', priority: '0.7', changefreq: 'monthly' },
            { url: '/certificates.html', priority: '0.7', changefreq: 'monthly' },
            { url: '/schedule.html', priority: '0.7', changefreq: 'weekly' }
        ];

        let dynamicItems = [];
        try {
            const [servicesRes, productsRes, postsRes] = await Promise.all([
                db.query('SELECT "serviceId", "updateDate" FROM services WHERE "isActive" = true').catch(() => ({ rows: [] })),
                db.query('SELECT "productId", "updateDate" FROM products WHERE "isActive" = true').catch(() => ({ rows: [] })),
                db.query('SELECT "postId", "updateDate" FROM posts WHERE "isPublished" = true').catch(() => ({ rows: [] }))
            ]);

            const services = (servicesRes?.rows || []).map(s => ({
                url: `/service.html?id=${encodeURIComponent(s.serviceId)}`,
                lastmod: s.updateDate ? new Date(s.updateDate).toISOString().split('T')[0] : null,
                priority: '0.8',
                changefreq: 'weekly'
            }));

            const products = (productsRes?.rows || []).map(p => ({
                url: `/product.html?id=${encodeURIComponent(p.productId)}`,
                lastmod: p.updateDate ? new Date(p.updateDate).toISOString().split('T')[0] : null,
                priority: '0.7',
                changefreq: 'weekly'
            }));

            const posts = (postsRes?.rows || []).map(p => ({
                url: `/post.html?id=${encodeURIComponent(p.postId)}`,
                lastmod: p.updateDate ? new Date(p.updateDate).toISOString().split('T')[0] : null,
                priority: '0.7',
                changefreq: 'monthly'
            }));

            dynamicItems = [...services, ...products, ...posts];
        } catch (e) {
            console.error('Ошибка сборки динамического sitemap:', e);
        }

        const allUrls = [...staticPages, ...dynamicItems];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(item => `    <url>
        <loc>${baseUrl}${item.url}</loc>${item.lastmod ? `\n        <lastmod>${item.lastmod}</lastmod>` : ''}
        <changefreq>${item.changefreq || 'weekly'}</changefreq>
        <priority>${item.priority || '0.5'}</priority>
    </url>`).join('\n')}
</urlset>`;

        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    } catch (e) {
        console.error('Ошибка getSitemap:', e);
        res.status(500).send('Error generating sitemap');
    }
};
