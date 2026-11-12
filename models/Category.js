const db = require('../database/db');

class Category {
    static async getAll() {
        const result = await db.query(
            `SELECT * FROM product_categories WHERE "isActive" = true ORDER BY "sortOrder", "categoryName"`
        );
        return result.rows;
    }

    static async getTree() {
        const categories = await this.getAll();
        const map = {};
        const tree = [];

        categories.forEach(cat => {
            map[cat.categoryId] = { ...cat, children: [] };
        });

        categories.forEach(cat => {
            if (cat.parentId && map[cat.parentId]) {
                map[cat.parentId].children.push(map[cat.categoryId]);
            } else {
                tree.push(map[cat.categoryId]);
            }
        });

        return tree;
    }




    static async create(data) {
        const result = await db.query(
            `INSERT INTO product_categories ("categoryName", "categorySlug", "categoryDescription", "parentId", "isActive")
         VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [data.categoryName, data.categorySlug, data.categoryDescription || null, data.parentId || null]
        );
        return result.rows[0];
    }


    static async update(categoryId, data) {
        const result = await db.query(
            `UPDATE product_categories SET "categoryName" = $1, "categorySlug" = $2, "categoryDescription" = $3, "parentId" = $4, "updateDate" = NOW()
             WHERE "categoryId" = $5 RETURNING *`,
            [data.categoryName, data.categorySlug, data.categoryDescription, data.parentId || null, categoryId]
        );
        return result.rows[0];
    }

    static async delete(categoryId) {
        await db.query('DELETE FROM product_categories WHERE "categoryId" = $1', [categoryId]);
    }
}

module.exports = Category;