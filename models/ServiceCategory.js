const db = require('../database/db');

class ServiceCategory {
    static async getAll() {
        const result = await db.query(
            `SELECT * FROM service_categories WHERE "isActive" = true ORDER BY "sortOrder", "categoryName"`
        );
        return result.rows;
    }

    static async create(data) {
        const result = await db.query(
            `INSERT INTO service_categories ("categoryName", "categorySlug", "categoryDescription", "isActive")
             VALUES ($1, $2, $3, true) RETURNING *`,
            [data.categoryName, data.categorySlug, data.categoryDescription || null]
        );
        return result.rows[0];
    }

    static async update(categoryId, data) {
        const result = await db.query(
            `UPDATE service_categories SET "categoryName" = $1, "categorySlug" = $2, "categoryDescription" = $3, "updateDate" = NOW()
             WHERE "categoryId" = $4 RETURNING *`,
            [data.categoryName, data.categorySlug, data.categoryDescription, categoryId]
        );
        return result.rows[0];
    }

    static async delete(categoryId) {
        await db.query('UPDATE service_categories SET "isActive" = false WHERE "categoryId" = $1', [categoryId]);
    }
}

module.exports = ServiceCategory;