const db = require('../database/db');

class Service {
    static async getAll(categoryId = null) {
        let query = `SELECT s.*, sc."categoryName"
                     FROM services s
                     LEFT JOIN service_categories sc ON s."categoryId" = sc."categoryId"
                     WHERE s."isActive" = true`;
        const values = [];

        if (categoryId) {
            query += ` AND s."categoryId" = $1`;
            values.push(categoryId);
        }

        query += ` ORDER BY s."createDate" DESC`;
        const result = await db.query(query, values);
        return result.rows;
    }

    static async getById(serviceId) {
        const result = await db.query(
            `SELECT s.*, sc."categoryName"
             FROM services s
             LEFT JOIN service_categories sc ON s."categoryId" = sc."categoryId"
             WHERE s."serviceId" = $1`,
            [serviceId]
        );
        return result.rows[0];
    }

    static async create(data) {
        if (!data.serviceSlug || data.serviceSlug.trim() === '') {
            data.serviceSlug = data.serviceName
                ? data.serviceName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') + '-' + Date.now()
                : 'service-' + Date.now();
        }

        const result = await db.query(
            `INSERT INTO services ("serviceName", "serviceSlug", "serviceDescription", "servicePrice", "durationMinutes", "categoryId", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
            [data.serviceName, data.serviceSlug, data.serviceDescription, data.servicePrice, data.durationMinutes || 30, data.categoryId || null]
        );
        return result.rows[0];
    }

    static async update(serviceId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowed = [
            'serviceName', 'serviceSlug', 'serviceDescription', 'servicePrice',
            'durationMinutes', 'categoryId', 'isActive'
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
        values.push(serviceId);

        const query = `UPDATE services SET ${updates.join(', ')} WHERE "serviceId" = $${paramCount} RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async delete(serviceId) {
        await db.query('DELETE FROM services WHERE "serviceId" = $1', [serviceId]);
    }
}

module.exports = Service;