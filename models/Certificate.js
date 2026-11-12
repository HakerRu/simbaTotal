const db = require('../database/db');

class Certificate {
    static async getAll(publishedOnly = true) {
        let query = 'SELECT * FROM certificates';
        if (publishedOnly) query += ' WHERE "isPublished" = true';
        query += ' ORDER BY "issueDate" DESC NULLS LAST, "createDate" DESC';

        const result = await db.query(query);
        return result.rows;
    }

    static async getById(certificateId) {
        const result = await db.query(
            'SELECT * FROM certificates WHERE "certificateId" = $1',
            [certificateId]
        );
        return result.rows[0];
    }

    static async create(data) {
        const result = await db.query(
            `INSERT INTO certificates ("certificateName", "certificateDescription", "issueDate", "fileUrl", "fileKey", "isPublished")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                data.certificateName,
                data.certificateDescription || null,
                data.issueDate || null,
                data.fileUrl || null,
                data.fileKey || null,
                data.isPublished !== undefined ? data.isPublished : true
            ]
        );
        return result.rows[0];
    }

    static async update(certificateId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowed = ['certificateName', 'certificateDescription', 'issueDate', 'fileUrl', 'fileKey', 'isPublished'];
        for (const [key, value] of Object.entries(data)) {
            if (allowed.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`"${key}" = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) return null;

        paramCount++;
        values.push(certificateId);
        const result = await db.query(
            `UPDATE certificates SET ${updates.join(', ')} WHERE "certificateId" = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(certificateId) {
        await db.query('DELETE FROM certificates WHERE "certificateId" = $1', [certificateId]);
    }
}

module.exports = Certificate;