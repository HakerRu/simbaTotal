const db = require('../database/db');

class Cart {
    static async getItems(userId) {
        const result = await db.query(
            `SELECT ci.*, p."productName", p."productPrice", p."productDiscountPrice", p."stockQuantity",
             (SELECT pi."imageUrl" FROM product_images pi WHERE pi."productId" = p."productId" AND pi."isMain" = true LIMIT 1) as "mainImage"
             FROM cart_items ci
             JOIN products p ON ci."productId" = p."productId"
             WHERE ci."userId" = $1`,
            [userId]
        );
        return result.rows;
    }

    static async getCount(userId) {
        const result = await db.query(
            `SELECT COALESCE(SUM("quantity"), 0) as count FROM cart_items WHERE "userId" = $1`,
            [userId]
        );
        return parseInt(result.rows[0].count);
    }

    static async addItem(userId, productId, quantity) {
        const result = await db.query(
            `INSERT INTO cart_items ("userId", "productId", "quantity")
             VALUES ($1, $2, $3)
             ON CONFLICT ("userId", "productId") DO UPDATE SET "quantity" = cart_items."quantity" + $3
             RETURNING *`,
            [userId, productId, quantity]
        );
        return result.rows[0];
    }

    static async updateQuantity(userId, productId, quantity) {
        const result = await db.query(
            `UPDATE cart_items SET "quantity" = $1 WHERE "userId" = $2 AND "productId" = $3 RETURNING *`,
            [quantity, userId, productId]
        );
        return result.rows[0];
    }

    static async removeItem(userId, productId) {
        await db.query('DELETE FROM cart_items WHERE "userId" = $1 AND "productId" = $2', [userId, productId]);
    }

    static async clear(userId) {
        await db.query('DELETE FROM cart_items WHERE "userId" = $1', [userId]);
    }
}

module.exports = Cart;