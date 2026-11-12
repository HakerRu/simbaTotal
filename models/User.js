const db = require('../database/db');

class User {
    static toPublic(user) {
        if (!user) return null;
        const {
            userPassword,
            refreshToken,
            refreshTokenExpires,
            emailVerificationToken,
            emailVerificationExpires,
            ...safe
        } = user;
        return safe;
    }

    static async findByEmail(email) {
        const result = await db.query('SELECT * FROM users WHERE "userEmail" = $1', [email]);
        return result.rows[0];
    }

    static async findById(userId) {
        const result = await db.query('SELECT * FROM users WHERE "userId" = $1', [userId]);
        return result.rows[0];
    }

    static async findByVerificationToken(token) {
        const result = await db.query(
            'SELECT * FROM users WHERE "emailVerificationToken" = $1 AND "isEmailVerified" = false',
            [token]
        );
        return result.rows[0];
    }

    static async create({ userEmail, userPassword, userFirstName, userLastName, userPhone, role, doctorStatus, isEmailVerified, emailVerificationToken, emailVerificationExpires }) {
        const result = await db.query(
            `INSERT INTO users ("userEmail", "userPassword", "userFirstName", "userLastName", "userPhone", "role", "doctorStatus", "isEmailVerified", "emailVerificationToken", "emailVerificationExpires")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [userEmail, userPassword, userFirstName, userLastName, userPhone, role, doctorStatus, isEmailVerified, emailVerificationToken, emailVerificationExpires]
        );
        return result.rows[0];
    }

    static async verifyEmail(userId) {
        await db.query(
            `UPDATE users SET "isEmailVerified" = true, "emailVerificationToken" = NULL, 
             "emailVerificationExpires" = NULL, "updateDate" = NOW() WHERE "userId" = $1`,
            [userId]
        );
    }

    static async updateVerificationToken(userId, token, expires) {
        await db.query(
            `UPDATE users SET "emailVerificationToken" = $1, "emailVerificationExpires" = $2, 
             "updateDate" = NOW() WHERE "userId" = $3`,
            [token, expires, userId]
        );
    }

    static async updateRefreshToken(userId, refreshToken, refreshTokenExpires) {
        await db.query(
            `UPDATE users SET "refreshToken" = $1, "refreshTokenExpires" = $2, "updateDate" = NOW()
             WHERE "userId" = $3`,
            [refreshToken, refreshTokenExpires, userId]
        );
    }

    static async updateLastLogin(userId) {
        await db.query('UPDATE users SET "lastLogin" = NOW() WHERE "userId" = $1', [userId]);
    }

    static async removeRefreshToken(userId) {
        await db.query('UPDATE users SET "refreshToken" = NULL, "refreshTokenExpires" = NULL WHERE "userId" = $1', [userId]);
    }

    static async getDoctors(activeOnly = true) {
        let query = `SELECT "userId", "userFirstName", "userLastName", "avatarUrl", 
                 "doctorSpecialization", "doctorDescription", "doctorExperienceYears", 
                 "doctorEducation", "vkLink", "telegramLink", "doctorPortfolio",
                 "doctorCertificatesList", "doctorServices", "doctorStatusText",
                 "doctorInstagram", "doctorWhatsapp", "doctorRating"
                 FROM users WHERE role = 'doctor'`;

        if (activeOnly) {
            query += ` AND "doctorStatus" = 'approved' AND "isActive" = true AND "isEmailVerified" = true`;
        }
        query += ` ORDER BY "userLastName", "userFirstName"`;

        const result = await db.query(query);
        return result.rows;
    }

    static async updateProfile(userId, data) {
        const allowedFields = [
            'userFirstName', 'userLastName', 'userPhone', 'avatarUrl', 'avatarKey',
            'doctorSpecialization', 'doctorDescription', 'doctorExperienceYears',
            'doctorEducation', 'doctorPortfolio', 'doctorCertificatesList',
            'doctorServices', 'doctorStatusText', 'vkLink', 'telegramLink',
            'doctorInstagram', 'doctorWhatsapp'
        ];

        const updates = [];
        const values = [];
        let paramCount = 0;

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`"${key}" = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) return null;

        paramCount++;
        updates.push(`"updateDate" = NOW()`);
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE "userId" = $${paramCount} RETURNING *`;
        const result = await db.query(query, values);
        return this.toPublic(result.rows[0]);
    }

    static async getAll(filters = {}) {
        let query = `SELECT * FROM users WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (filters.role) {
            paramCount++;
            query += ` AND "role" = $${paramCount}`;
            values.push(filters.role);
        }

        if (filters.doctorStatus) {
            paramCount++;
            query += ` AND "doctorStatus" = $${paramCount}`;
            values.push(filters.doctorStatus);
        }

        if (filters.isActive !== undefined) {
            paramCount++;
            query += ` AND "isActive" = $${paramCount}`;
            values.push(filters.isActive);
        }

        query += ` ORDER BY "createDate" DESC`;

        const result = await db.query(query, values);
        return result.rows.map((row) => this.toPublic(row));
    }

    static async findPublicDoctor(userId) {
        const result = await db.query(
            `SELECT "userId", "userFirstName", "userLastName", "avatarUrl",
             "doctorSpecialization", "doctorDescription", "doctorExperienceYears",
             "doctorEducation", "vkLink", "telegramLink", "doctorPortfolio",
             "doctorCertificatesList", "doctorServices", "doctorStatusText",
             "doctorInstagram", "doctorWhatsapp", "doctorRating"
             FROM users
             WHERE "userId" = $1 AND role = 'doctor'
               AND "doctorStatus" = 'approved' AND "isActive" = true AND "isEmailVerified" = true`,
            [userId]
        );
        return result.rows[0];
    }

    static async getPendingDoctors() {
        const result = await db.query(
            `SELECT * FROM users WHERE role = 'doctor' AND "doctorStatus" = 'pending' ORDER BY "createDate" DESC`
        );
        return result.rows.map((row) => this.toPublic(row));
    }


    static async updateStatus(userId, data) {
        const updates = [];
        const values = [];
        let paramCount = 0;

        const allowedStatuses = ['pending', 'approved', 'rejected'];
        if (allowedStatuses.includes(data.doctorStatus)) {
            paramCount++;
            updates.push(`"doctorStatus" = $${paramCount}`);
            values.push(data.doctorStatus);
        }

        if (typeof data.isActive === 'boolean') {
            paramCount++;
            updates.push(`"isActive" = $${paramCount}`);
            values.push(data.isActive);
        }

        if (updates.length === 0) return null;

        paramCount++;
        updates.push(`"updateDate" = NOW()`);
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE "userId" = $${paramCount} RETURNING *`;
        const result = await db.query(query, values);
        return this.toPublic(result.rows[0]);
    }
}

module.exports = User;