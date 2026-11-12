const db = require('../database/db');

class Product {
    static async getAll({ category = 'all', sort = 'default', search = '', page = 1, limit = 9 }) {
        let query = `SELECT p.*, pc."categoryName",
                     (SELECT pi."imageUrl" FROM product_images pi WHERE pi."productId" = p."productId" AND pi."isMain" = true LIMIT 1) as "mainImage"
                     FROM products p
                     LEFT JOIN product_categories pc ON p."categoryId" = pc."categoryId"
                     WHERE p."isActive" = true`;
        const values = [];
        let paramCount = 0;

        if (category !== 'all') {
            paramCount++;
            query += ` AND p."categoryId" = $${paramCount}`;
            values.push(category);
        }

        if (search) {
            paramCount++;
            query += ` AND p."productName" ILIKE $${paramCount}`;
            values.push(`%${search}%`);
        }

        switch (sort) {
            case 'price_asc': query += ` ORDER BY p."productPrice" ASC`; break;
            case 'price_desc': query += ` ORDER BY p."productPrice" DESC`; break;
            case 'name': query += ` ORDER BY p."productName" ASC`; break;
            default: query += ` ORDER BY p."createDate" DESC`;
        }

        const offset = (page - 1) * limit;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        values.push(limit);
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        values.push(offset);

        const result = await db.query(query, values);
        return result.rows;
    }

    static async getTotal({ category = 'all', search = '' }) {
        let query = `SELECT COUNT(*) as total FROM products p WHERE p."isActive" = true`;
        const values = [];
        let paramCount = 0;

        if (category !== 'all') {
            paramCount++;
            query += ` AND p."categoryId" = $${paramCount}`;
            values.push(category);
        }

        if (search) {
            paramCount++;
            query += ` AND p."productName" ILIKE $${paramCount}`;
            values.push(`%${search}%`);
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].total);
    }

    static async getById(productId) {
        const result = await db.query(
            `SELECT p.*, pc."categoryName",
         (SELECT json_agg(pi.*) FROM product_images pi WHERE pi."productId" = p."productId") as images,
         (SELECT pi."imageUrl" FROM product_images pi WHERE pi."productId" = p."productId" AND pi."isMain" = true LIMIT 1) as "mainImage"
         FROM products p
         LEFT JOIN product_categories pc ON p."categoryId" = pc."categoryId"
         WHERE p."productId" = $1`,
            [productId]
        );
        return result.rows[0];
    }

    static async create(data) {
        // Генерация slug если пустой
        if (!data.productSlug || data.productSlug.trim() === '') {
            data.productSlug = data.productName
                ? data.productName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') + '-' + Date.now()
                : 'product-' + Date.now();
        }

        const result = await db.query(
            `INSERT INTO products ("productName", "productSlug", "productDescription", "productPrice", "productDiscountPrice", "stockQuantity", "categoryId", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
            [data.productName, data.productSlug, data.productDescription, data.productPrice, data.productDiscountPrice || null, data.stockQuantity || 0, data.categoryId || null]
        );
        return result.rows[0];
    }
    static async addImages(productId, images) {
        for (let i = 0; i < images.length; i++) {
            await db.query(
                `INSERT INTO product_images ("productId", "imageUrl", "imageKey", "isMain", "sortOrder")
             VALUES ($1, $2, $3, $4, $5)`,
                [productId, images[i].url, images[i].key, i === 0, i]
            );
        }
    }

    static async deleteImages(productId) {
        await db.query('DELETE FROM product_images WHERE "productId" = $1', [productId]);
    }

    static async getImages(productId) {
        const result = await db.query(
            'SELECT * FROM product_images WHERE "productId" = $1 ORDER BY "sortOrder"',
            [productId]
        );
        return result.rows;
    }
    static async update(productId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowed = [
            'productName', 'productSlug', 'productDescription', 'productPrice',
            'productDiscountPrice', 'stockQuantity', 'categoryId', 'isActive'
        ];
        for (const [key, value] of Object.entries(data)) {
            if (allowed.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`"${key}" = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) return null;

        paramCount++;
        updates.push(`"updateDate" = NOW()`);
        values.push(productId);

        const query = `UPDATE products SET ${updates.join(', ')} WHERE "productId" = $${paramCount} RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async delete(productId) {
        await db.query('DELETE FROM product_images WHERE "productId" = $1', [productId]);
        await db.query('DELETE FROM cart_items WHERE "productId" = $1', [productId]);
        await db.query('DELETE FROM products WHERE "productId" = $1', [productId]);
    }
}

module.exports = Product;