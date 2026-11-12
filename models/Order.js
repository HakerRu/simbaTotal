const db = require('../database/db');

class Order {
    static async create({ orderNumber, userId, customerName, customerPhone, pickupDate, pickupTime, totalAmount, items, orderNotes }) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const orderResult = await client.query(
                `INSERT INTO orders ("orderNumber", "userId", "customerName", "customerPhone", "pickupDate", "pickupTime", "totalAmount", "orderNotes", "orderStatus")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
                [orderNumber, userId, customerName, customerPhone, pickupDate, pickupTime, totalAmount, orderNotes || null]
            );

            const order = orderResult.rows[0];

            for (const item of items) {
                await client.query(
                    `INSERT INTO order_items ("orderId", "productId", "productName", "quantity", "price")
                     VALUES ($1, $2, $3, $4, $5)`,
                    [order.orderId, item.productId, item.productName, item.quantity, item.price]
                );

                await client.query(
                    `UPDATE products SET "stockQuantity" = "stockQuantity" - $1 WHERE "productId" = $2`,
                    [item.quantity, item.productId]
                );
            }

            await client.query('DELETE FROM cart_items WHERE "userId" = $1', [userId]);

            await client.query('COMMIT');
            return order;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async getByUser(userId) {
        const result = await db.query(
            `SELECT o.*,
             (SELECT json_agg(oi.*) FROM order_items oi WHERE oi."orderId" = o."orderId") as items
             FROM orders o
             WHERE o."userId" = $1
             ORDER BY o."createDate" DESC`,
            [userId]
        );
        return result.rows;
    }

    static async getById(orderId) {
        const result = await db.query(
            `SELECT o.*,
             (SELECT json_agg(oi.*) FROM order_items oi WHERE oi."orderId" = o."orderId") as items
             FROM orders o
             WHERE o."orderId" = $1`,
            [orderId]
        );
        return result.rows[0];
    }

    static async countBySlot(pickupDate, pickupTime) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM orders 
                 WHERE "pickupDate" = $1 AND "pickupTime" = $2::time AND "orderStatus" != 'cancelled'`,
                [pickupDate, pickupTime]
            );
            return parseInt(result.rows[0].count);
        } catch (e) {
            console.error('countBySlot error:', e);
            return 0;
        }
    }
    static async delete(orderId) {
        await db.query('DELETE FROM orders WHERE "orderId" = $1', [orderId]);
    }


    static async getAll(filters = {}) {
        let query = `SELECT o.*, u."userEmail",
                     (SELECT json_agg(oi.*) FROM order_items oi WHERE oi."orderId" = o."orderId") as items
                     FROM orders o
                     LEFT JOIN users u ON o."userId" = u."userId"
                     WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND o."orderStatus" = $${paramCount}`;
            values.push(filters.status);
        }

        query += ` ORDER BY o."createDate" DESC`;

        const result = await db.query(query, values);
        return result.rows;
    }

    static async updateStatus(orderId, status) {
        const result = await db.query(
            `UPDATE orders SET "orderStatus" = $1, "updateDate" = NOW() WHERE "orderId" = $2 RETURNING *`,
            [status, orderId]
        );
        return result.rows[0];
    }
}

module.exports = Order;