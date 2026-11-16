const db = require('../database/db');

const EDIT_WINDOW_MS = 30 * 60 * 1000;
const ACTIVE_STATUSES = ['pending', 'ready'];

const canEditOrder = (order, now = Date.now()) => (
    order?.orderStatus === 'pending'
    && (now - new Date(order.createDate).getTime()) < EDIT_WINDOW_MS
);

const canCancelOrder = (order, now = Date.now()) => (
    ACTIVE_STATUSES.includes(order?.orderStatus)
    && (now - new Date(order.createDate).getTime()) < EDIT_WINDOW_MS
);

const restoreStock = async (client, orderId) => {
    const itemsRes = await client.query(
        'SELECT "productId", "quantity" FROM order_items WHERE "orderId" = $1',
        [orderId]
    );
    for (const item of itemsRes.rows) {
        if (!item.productId) continue;
        await client.query(
            'UPDATE products SET "stockQuantity" = "stockQuantity" + $1, "updateDate" = NOW() WHERE "productId" = $2',
            [item.quantity, item.productId]
        );
    }
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

class Order {
    static async create({ orderNumber, userId, customerName, customerPhone, pickupAddress, pickupDate, pickupTime, orderNotes }) {
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
                `INSERT INTO orders ("orderNumber", "userId", "customerName", "customerPhone", "pickupAddress", "pickupDate", "pickupTime", "totalAmount", "orderNotes", "orderStatus")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
                [orderNumber, userId, customerName, customerPhone, pickupAddress || null, pickupDate, pickupTime, totalAmount.toFixed(2), orderNotes || null]
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

            let cancelReason = current.cancelReason || null;
            if (prevStatus !== status) {
                if (status === 'cancelled' && prevStatus !== 'cancelled') {
                    cancelReason = current.cancelReason || 'staff';
                } else if (prevStatus === 'cancelled' && status !== 'cancelled') {
                    cancelReason = null;
                }
            }

            const result = await client.query(
                `UPDATE orders SET "orderStatus" = $1, "cancelReason" = $2, "updateDate" = NOW() WHERE "orderId" = $3 RETURNING *`,
                [status, cancelReason, orderId]
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

    static async findActive(userId) {
        const result = await db.query(
            `SELECT o.*,
             (SELECT json_agg(oi.*) FROM order_items oi WHERE oi."orderId" = o."orderId") as items
             FROM orders o
             WHERE o."userId" = $1 AND o."orderStatus" IN ('pending', 'ready')
             ORDER BY o."createDate" DESC
             LIMIT 1`,
            [userId]
        );
        return result.rows[0] || null;
    }

    static async expireNoShows() {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const due = await client.query(
                `SELECT o."orderId", o."userId", u.role
                 FROM orders o
                 JOIN users u ON u."userId" = o."userId"
                 WHERE o."orderStatus" IN ('pending', 'ready')
                   AND ((o."pickupDate" + o."pickupTime") AT TIME ZONE 'Asia/Yekaterinburg')
                       + interval '30 minutes' < NOW()
                 FOR UPDATE OF o`
            );

            for (const row of due.rows) {
                await restoreStock(client, row.orderId);
                await client.query(
                    `UPDATE orders SET "orderStatus" = 'cancelled', "cancelReason" = 'noshow', "updateDate" = NOW()
                     WHERE "orderId" = $1`,
                    [row.orderId]
                );
                if (row.role !== 'admin') {
                    await client.query(
                        `UPDATE users
                         SET "noShowCount" = "noShowCount" + 1,
                             "ordersBlocked" = ("noShowCount" + 1) >= 2,
                             "updateDate" = NOW()
                         WHERE "userId" = $1`,
                        [row.userId]
                    );
                }
            }

            await client.query('COMMIT');
            return due.rows.length;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async cancelByOwner(orderId, userId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const currentRes = await client.query(
                'SELECT * FROM orders WHERE "orderId" = $1 FOR UPDATE',
                [orderId]
            );
            const current = currentRes.rows[0];
            if (!current || String(current.userId) !== String(userId)) {
                await client.query('ROLLBACK');
                return null;
            }
            if (!canCancelOrder(current)) {
                throw new HttpError(400, 'Отменить заказ можно только в первые 30 минут');
            }

            await restoreStock(client, orderId);
            const result = await client.query(
                `UPDATE orders SET "orderStatus" = 'cancelled', "cancelReason" = 'user', "updateDate" = NOW()
                 WHERE "orderId" = $1 RETURNING *`,
                [orderId]
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

    static async replaceContents(orderId, userId, { items, pickupAddress, pickupDate, pickupTime, orderNotes }) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const currentRes = await client.query(
                'SELECT * FROM orders WHERE "orderId" = $1 FOR UPDATE',
                [orderId]
            );
            const current = currentRes.rows[0];
            if (!current || String(current.userId) !== String(userId)) {
                await client.query('ROLLBACK');
                return null;
            }
            if (!canEditOrder(current)) {
                throw new HttpError(400, 'Состав заказа можно менять только в первые 30 минут, пока его не взяли в сборку');
            }

            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`slot:${pickupDate}:${pickupTime}`]);
            const slotResult = await client.query(
                `SELECT COUNT(*)::int as count FROM orders
                 WHERE "pickupDate" = $1 AND "pickupTime" = $2::time
                   AND "orderStatus" != 'cancelled' AND "orderId" != $3`,
                [pickupDate, pickupTime, orderId]
            );
            if (slotResult.rows[0].count >= 4) {
                throw new HttpError(400, 'Это время уже занято, выберите другое');
            }

            await restoreStock(client, orderId);

            let totalAmount = 0;
            const prepared = [];
            for (const item of items) {
                const productRes = await client.query(
                    `SELECT "productId", "productName", "productPrice", "productDiscountPrice", "isActive"
                     FROM products WHERE "productId" = $1 FOR UPDATE`,
                    [item.productId]
                );
                const product = productRes.rows[0];
                if (!product || !product.isActive) {
                    throw new HttpError(409, 'Один из товаров больше недоступен');
                }
                const deduct = await client.query(
                    `UPDATE products SET "stockQuantity" = "stockQuantity" - $1, "updateDate" = NOW()
                     WHERE "productId" = $2 AND "isActive" = true AND "stockQuantity" >= $1
                     RETURNING "productId"`,
                    [item.quantity, item.productId]
                );
                if (deduct.rowCount === 0) {
                    throw new HttpError(409, `Недостаточно товара на складе: ${product.productName}`);
                }
                const unitPrice = Number(product.productDiscountPrice || product.productPrice);
                totalAmount += unitPrice * item.quantity;
                prepared.push({
                    productId: product.productId,
                    productName: product.productName,
                    quantity: item.quantity,
                    price: unitPrice
                });
            }

            await client.query('DELETE FROM order_items WHERE "orderId" = $1', [orderId]);
            for (const item of prepared) {
                await client.query(
                    `INSERT INTO order_items ("orderId", "productId", "productName", "quantity", "price")
                     VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, item.productId, item.productName, item.quantity, item.price]
                );
            }

            const updated = await client.query(
                `UPDATE orders
                 SET "pickupAddress" = $1, "pickupDate" = $2, "pickupTime" = $3::time,
                     "orderNotes" = $4, "totalAmount" = $5, "updateDate" = NOW()
                 WHERE "orderId" = $6 RETURNING *`,
                [pickupAddress, pickupDate, pickupTime, orderNotes || null, totalAmount.toFixed(2), orderId]
            );
            await client.query('COMMIT');
            return updated.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

Order.HttpError = HttpError;
Order.canEditOrder = canEditOrder;
Order.canCancelOrder = canCancelOrder;

module.exports = Order;