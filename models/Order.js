const db = require('../database/db');

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

class Order {
    static async create({ orderNumber, userId, customerName, customerPhone, pickupDate, pickupTime, orderNotes }) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const cartResult = await client.query(
                `SELECT ci."productId", ci."quantity", p."productName", p."productPrice", p."productDiscountPrice", p."stockQuantity", p."isActive"
                 FROM cart_items ci
                 JOIN products p ON ci."productId" = p."productId"
                 WHERE ci."userId" = $1`,
                [userId]
            );

            const cartItems = cartResult.rows;
            if (cartItems.length === 0) {
                throw new HttpError(400, 'Корзина пуста');
            }

            // Serialize slot checks for the same date/time inside this transaction
            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`slot:${pickupDate}:${pickupTime}`]);

            const slotResult = await client.query(
                `SELECT COUNT(*)::int as count FROM orders
                 WHERE "pickupDate" = $1 AND "pickupTime" = $2::time AND "orderStatus" != 'cancelled'`,
                [pickupDate, pickupTime]
            );
            if (slotResult.rows[0].count >= 4) {
                throw new HttpError(400, 'Это время уже занято, выберите другое');
            }

            let totalAmount = 0;
            const preparedItems = [];

            for (const item of cartItems) {
                if (!item.isActive) {
                    throw new HttpError(409, `Товар недоступен: ${item.productName}`);
                }

                const stockUpdate = await client.query(
                    `UPDATE products SET "stockQuantity" = "stockQuantity" - $1, "updateDate" = NOW()
                     WHERE "productId" = $2 AND "isActive" = true AND "stockQuantity" >= $1
                     RETURNING "productId"`,
                    [item.quantity, item.productId]
                );

                if (stockUpdate.rowCount === 0) {
                    throw new HttpError(409, `Недостаточно товара на складе: ${item.productName}`);
                }

                const unitPrice = Number(item.productDiscountPrice || item.productPrice);
                totalAmount += unitPrice * item.quantity;
                preparedItems.push({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: unitPrice
                });
            }

            const orderResult = await client.query(
                `INSERT INTO orders ("orderNumber", "userId", "customerName", "customerPhone", "pickupDate", "pickupTime", "totalAmount", "orderNotes", "orderStatus")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
                [orderNumber, userId, customerName, customerPhone, pickupDate, pickupTime, totalAmount.toFixed(2), orderNotes || null]
            );

            const order = orderResult.rows[0];

            for (const item of preparedItems) {
                await client.query(
                    `INSERT INTO order_items ("orderId", "productId", "productName", "quantity", "price")
                     VALUES ($1, $2, $3, $4, $5)`,
                    [order.orderId, item.productId, item.productName, item.quantity, item.price]
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
        const result = await db.query(
            `SELECT COUNT(*)::int as count FROM orders 
             WHERE "pickupDate" = $1 AND "pickupTime" = $2::time AND "orderStatus" != 'cancelled'`,
            [pickupDate, pickupTime]
        );
        return result.rows[0].count;
    }

    static async countSlotsByDate(pickupDate) {
        const result = await db.query(
            `SELECT to_char("pickupTime", 'HH24:MI') as time, COUNT(*)::int as count
             FROM orders
             WHERE "pickupDate" = $1 AND "orderStatus" != 'cancelled'
             GROUP BY "pickupTime"`,
            [pickupDate]
        );
        const slots = {};
        for (const row of result.rows) {
            slots[row.time] = row.count;
        }
        return slots;
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
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const currentRes = await client.query(
                'SELECT * FROM orders WHERE "orderId" = $1 FOR UPDATE',
                [orderId]
            );
            const current = currentRes.rows[0];
            if (!current) {
                await client.query('ROLLBACK');
                return null;
            }

            const prevStatus = current.orderStatus;
            if (prevStatus !== status) {
                const itemsRes = await client.query(
                    'SELECT "productId", "productName", "quantity" FROM order_items WHERE "orderId" = $1',
                    [orderId]
                );

                if (prevStatus !== 'cancelled' && status === 'cancelled') {
                    for (const item of itemsRes.rows) {
                        if (item.productId) {
                            await client.query(
                                'UPDATE products SET "stockQuantity" = "stockQuantity" + $1, "updateDate" = NOW() WHERE "productId" = $2',
                                [item.quantity, item.productId]
                            );
                        }
                    }
                } else if (prevStatus === 'cancelled' && status !== 'cancelled') {
                    for (const item of itemsRes.rows) {
                        if (!item.productId) {
                            throw new HttpError(409, `Товар больше не существует: ${item.productName}`);
                        }
                        const deduct = await client.query(
                            'UPDATE products SET "stockQuantity" = "stockQuantity" - $1, "updateDate" = NOW() WHERE "productId" = $2 AND "stockQuantity" >= $1 RETURNING "productId"',
                            [item.quantity, item.productId]
                        );
                        if (deduct.rowCount === 0) {
                            throw new HttpError(409, `Недостаточно товара на складе: ${item.productName}`);
                        }
                    }
                }
            }

            const result = await client.query(
                `UPDATE orders SET "orderStatus" = $1, "updateDate" = NOW() WHERE "orderId" = $2 RETURNING *`,
                [status, orderId]
            );
            await client.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

Order.HttpError = HttpError;

module.exports = Order;