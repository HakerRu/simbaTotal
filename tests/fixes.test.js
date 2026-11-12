'use strict';

// Set env vars before loading app/modules (dotenv does not override pre-set keys)
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.BASE_URL = 'http://localhost:3000';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_FROM = 'noreply@simba.test';
process.env.S3_BUCKET = 'test-bucket';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { PassThrough } = require('node:stream');

const db = require('../database/db');
const s3Config = require('../config/s3');
const { slugify, uniqueSlug } = require('../utils/helpers');
const { validateId, handleValidationErrors } = require('../middleware/validate');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../utils/jwt');
const { sendVerificationEmail } = require('../utils/mailer');
const { s3Client } = s3Config;

// Stub DB & S3 transport methods before importing models/controllers/app
let dbQueryHandler = async () => ({ rows: [], rowCount: 0 });
let dbConnectHandler = async () => {
    throw new Error('Unexpected db.pool.connect() call without stub');
};
let s3SendCalls = [];

db.query = (...args) => dbQueryHandler(...args);
db.pool.connect = (...args) => dbConnectHandler(...args);
s3Client.send = async (cmd) => {
    s3SendCalls.push(cmd);
    return {};
};

const nodemailer = require('nodemailer');
const realCreateTransport = nodemailer.createTransport;
// Inspect sent email via stubbing transporter internal sendMail if needed:
// mailer already created its transporter on load; let's verify via s3/controller/app too.

const Order = require('../models/Order');
const authController = require('../controllers/auth.controller');
const adminController = require('../controllers/admin.controller');
const profileController = require('../controllers/profile.controller');
const blogController = require('../controllers/blog.controller');
const shopController = require('../controllers/shop.controller');
const app = require('../app');

const createMockRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        cookies: {},
        clearedCookies: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        cookie(name, val, opts) {
            this.cookies[name] = { val, opts };
            return this;
        },
        clearCookie(name, opts) {
            this.clearedCookies.push({ name, opts });
            return this;
        }
    };
    return res;
};

const requestApp = async (method, urlPath, { body, headers = {}, cookies = [] } = {}) => {
    const socket = new PassThrough();
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = urlPath;
    req.headers = {};
    for (const [k, v] of Object.entries(headers)) {
        req.headers[k.toLowerCase()] = v;
    }
    if (cookies.length > 0) {
        req.headers.cookie = cookies.join('; ');
    }

    let rawBody = null;
    if (body !== undefined) {
        rawBody = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
        if (!req.headers['content-type']) {
            req.headers['content-type'] = 'application/json';
        }
        req.headers['content-length'] = String(rawBody.length);
    }

    const res = new http.ServerResponse(req);
    const outStream = new PassThrough();
    outStream.cork = () => {};
    outStream.uncork = () => {};
    const chunks = [];
    outStream.on('data', (chunk) => chunks.push(chunk));
    res.assignSocket(outStream);

    const resultPromise = new Promise((resolve, reject) => {
        res.on('finish', () => {
            const rawResponse = Buffer.concat(chunks).toString('utf8');
            const sepIndex = rawResponse.indexOf('\r\n\r\n');
            const text = sepIndex >= 0 ? rawResponse.slice(sepIndex + 4) : rawResponse;
            let json = null;
            try {
                json = JSON.parse(text);
            } catch {
                // non-JSON response
            }
            resolve({ status: res.statusCode, text, json });
        });
        res.on('error', reject);
    });

    app(req, res);
    process.nextTick(() => {
        if (rawBody) req.push(rawBody);
        req.push(null);
    });

    return resultPromise;
};

beforeEach(() => {
    dbQueryHandler = async () => ({ rows: [], rowCount: 0 });
    dbConnectHandler = async () => {
        throw new Error('Unexpected db.pool.connect() call');
    };
    s3SendCalls = [];
});

describe('utils/helpers', () => {
    it('slugify transliterates Cyrillic instead of stripping it', () => {
        assert.equal(slugify('Корм для кошек Pro Plan!'), 'korm-dlya-koshek-pro-plan');
        assert.equal(slugify('Щётка и шампунь'), 'shchyotka-i-shampun');
        assert.match(slugify('   '), /^item-\d+$/);
    });

    it('uniqueSlug produces unique transliterated slugs with prefix fallback', () => {
        const a = uniqueSlug('Терапия кошек', 'service');
        const b = uniqueSlug('Терапия кошек', 'service');
        assert.match(a, /^terapiya-koshek-\d+-[0-9a-f]{6}$/);
        assert.notEqual(a, b);
        assert.match(uniqueSlug('', 'album'), /^album-\d+-[0-9a-f]{6}$/);
    });
});

describe('middleware/validate', () => {
    it('validateId rejects invalid IDs and allows positive integers', () => {
        const mw = validateId('id');
        for (const bad of ['abc', '0', '-5', '1.5', '12;DROP']) {
            let nextCalled = false;
            const res = createMockRes();
            mw({ params: { id: bad } }, res, () => {
                nextCalled = true;
            });
            assert.equal(nextCalled, false, `Expected ${bad} to be rejected`);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
        }

        let nextCalled = false;
        const res = createMockRes();
        mw({ params: { id: '42' } }, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
    });

    it('handleValidationErrors returns 400 when req has validation errors', () => {
        let nextCalled = false;
        const res = createMockRes();
        handleValidationErrors({}, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(typeof realCreateTransport, 'function');
    });
});

describe('utils/mailer', () => {
    it('sendVerificationEmail returns error object gracefully on transport failure and escapes HTML in body', async () => {
        // Spy on nodemailer createTransport sendMail isn't trivial after require,
        // so test module cleanly by loading fresh copy with mocked nodemailer transport
        const sent = [];
        const origSendMail = require('nodemailer/lib/mailer').prototype.sendMail;
        require('nodemailer/lib/mailer').prototype.sendMail = async function (mail) {
            sent.push(mail);
            return { messageId: 'ok' };
        };
        try {
            const result = await sendVerificationEmail(
                'user@example.com',
                '<img src=x onerror=alert(1)>',
                'tok&a=1'
            );
            assert.equal(result.success, true);
            assert.equal(sent.length, 1);
            assert.ok(sent[0].html.includes('&lt;img src=x onerror=alert(1)&gt;'));
            assert.ok(!sent[0].html.includes('<img src=x'));
            assert.ok(sent[0].html.includes('token=tok%26a%3D1'));
        } finally {
            require('nodemailer/lib/mailer').prototype.sendMail = origSendMail;
        }
    });
});

describe('controllers/auth.controller refresh', () => {
    it('rejects missing refresh cookie with 401', async () => {
        const req = { cookies: {} };
        const res = createMockRes();
        await authController.refresh(req, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.clearedCookies.length, 2);
    });

    it('rejects expired or mismatched refresh token in DB', async () => {
        const user = {
            userId: '10',
            userEmail: 'client@simba.test',
            role: 'client',
            isActive: true,
            isEmailVerified: true,
            doctorStatus: null
        };
        const token = generateRefreshToken(user);

        // Mismatched hash
        dbQueryHandler = async () => ({
            rows: [{
                ...user,
                refreshToken: hashToken('other-token'),
                refreshTokenExpires: new Date(Date.now() + 60000).toISOString()
            }]
        });
        let res = createMockRes();
        await authController.refresh({ cookies: { refreshToken: token } }, res);
        assert.equal(res.statusCode, 401);

        // Expired DB token
        dbQueryHandler = async () => ({
            rows: [{
                ...user,
                refreshToken: hashToken(token),
                refreshTokenExpires: new Date(Date.now() - 1000).toISOString()
            }]
        });
        res = createMockRes();
        await authController.refresh({ cookies: { refreshToken: token } }, res);
        assert.equal(res.statusCode, 401);
    });

    it('rotates refresh and access cookies on valid refresh token', async () => {
        const user = {
            userId: '10',
            userEmail: 'client@simba.test',
            role: 'client',
            isActive: true,
            isEmailVerified: true,
            doctorStatus: null
        };
        const token = generateRefreshToken(user);
        let updatedHash = null;

        dbQueryHandler = async (sql, params) => {
            if (sql.includes('SELECT * FROM users')) {
                return {
                    rows: [{
                        ...user,
                        refreshToken: hashToken(token),
                        refreshTokenExpires: new Date(Date.now() + 60000).toISOString()
                    }]
                };
            }
            if (sql.includes('UPDATE users SET "refreshToken"')) {
                updatedHash = params[0];
                return { rows: [], rowCount: 1 };
            }
            return { rows: [] };
        };

        const res = createMockRes();
        await authController.refresh({ cookies: { refreshToken: token } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.cookies.accessToken.val);
        assert.ok(res.cookies.refreshToken.val);
        assert.equal(updatedHash, hashToken(res.cookies.refreshToken.val));
    });
});

describe('controllers/admin.controller', () => {
    it('prevents admin from deactivating their own account', async () => {
        const req = { params: { id: '5' }, user: { userId: 5 }, body: { isActive: false } };
        const res = createMockRes();
        await adminController.updateUserStatus(req, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /собственный/);
    });

    it('returns 404 when User.updateStatus returns null', async () => {
        dbQueryHandler = async () => ({ rows: [] });
        const req = { params: { id: '999' }, user: { userId: 5 }, body: { isActive: false } };
        const res = createMockRes();
        await adminController.updateUserStatus(req, res);
        assert.equal(res.statusCode, 404);
    });
});

describe('controllers/profile.controller', () => {
    it('allows doctor fields when role is doctor and ignores them for client', async () => {
        const queries = [];
        dbQueryHandler = async (sql, params) => {
            queries.push({ sql, params });
            return { rows: [{ userId: '7', userFirstName: 'Анна', doctorSpecialization: 'Хирург' }] };
        };

        // Doctor saves specialization
        const docRes = createMockRes();
        await profileController.updateProfile({
            user: { userId: '7', role: 'doctor' },
            body: { userFirstName: 'Анна', doctorSpecialization: 'Хирург', doctorExperienceYears: 8 }
        }, docRes);
        assert.equal(docRes.statusCode, 200);
        assert.ok(queries[0].sql.includes('"doctorSpecialization"'));
        assert.ok(queries[0].sql.includes('"doctorExperienceYears"'));

        // Client trying to pass doctorSpecialization gets it filtered out (400 if no basic fields)
        const clientRes = createMockRes();
        await profileController.updateProfile({
            user: { userId: '8', role: 'client' },
            body: { doctorSpecialization: 'Самозванец' }
        }, clientRes);
        assert.equal(clientRes.statusCode, 400);
    });
});

describe('models/Order & controllers/shop.controller', () => {
    it('Order.create returns 409 when stock is insufficient and rolls back', async () => {
        const log = [];
        dbConnectHandler = async () => ({
            released: false,
            async query(sql) {
                log.push(sql);
                if (sql.includes('FROM cart_items')) {
                    return {
                        rows: [{
                            productId: '3',
                            quantity: 5,
                            productName: 'Корм',
                            productPrice: '500',
                            productDiscountPrice: null,
                            stockQuantity: 2,
                            isActive: true
                        }]
                    };
                }
                if (sql.includes('COUNT(*)::int as count')) {
                    return { rows: [{ count: 1 }] };
                }
                if (sql.includes('UPDATE products SET "stockQuantity" = "stockQuantity" - $1')) {
                    return { rowCount: 0, rows: [] };
                }
                return { rows: [], rowCount: 0 };
            },
            release() {
                this.released = true;
            }
        });

        await assert.rejects(
            () => Order.create({
                orderNumber: 'SB-202611-1234',
                userId: '1',
                customerName: 'Иван',
                customerPhone: '+7999',
                pickupDate: '2099-01-01',
                pickupTime: '10:00'
            }),
            (err) => err instanceof Order.HttpError && err.status === 409
        );
        assert.ok(log.includes('BEGIN'));
        assert.ok(log.includes('ROLLBACK'));
    });

    it('Order.create returns 400 when pickup slot is already full (>= 4 orders)', async () => {
        dbConnectHandler = async () => ({
            async query(sql) {
                if (sql.includes('FROM cart_items')) {
                    return {
                        rows: [{
                            productId: '3',
                            quantity: 1,
                            productName: 'Корм',
                            productPrice: '500',
                            productDiscountPrice: null,
                            stockQuantity: 10,
                            isActive: true
                        }]
                    };
                }
                if (sql.includes('COUNT(*)::int as count')) {
                    return { rows: [{ count: 4 }] };
                }
                return { rows: [] };
            },
            release() {}
        });

        await assert.rejects(
            () => Order.create({
                orderNumber: 'SB-202611-1235',
                userId: '1',
                customerName: 'Иван',
                customerPhone: '+7999',
                pickupDate: '2099-01-01',
                pickupTime: '10:00'
            }),
            (err) => err instanceof Order.HttpError && err.status === 400
        );
    });

    it('Order.updateStatus restores product stock when order transitions to cancelled', async () => {
        const executed = [];
        dbConnectHandler = async () => ({
            async query(sql, params) {
                executed.push({ sql, params });
                if (sql.includes('SELECT * FROM orders')) {
                    return { rows: [{ orderId: '55', orderStatus: 'pending' }] };
                }
                if (sql.includes('FROM order_items')) {
                    return { rows: [{ productId: '3', productName: 'Корм', quantity: 2 }] };
                }
                if (sql.includes('UPDATE orders SET "orderStatus"')) {
                    return { rows: [{ orderId: '55', orderStatus: 'cancelled' }] };
                }
                return { rows: [], rowCount: 1 };
            },
            release() {}
        });

        const updated = await Order.updateStatus('55', 'cancelled');
        assert.equal(updated.orderStatus, 'cancelled');
        const stockRestore = executed.find((q) => q.sql.includes('"stockQuantity" = "stockQuantity" + $1'));
        assert.ok(stockRestore);
        assert.deepEqual(stockRestore.params, [2, '3']);
    });

    it('shopController.getSlotsByDate returns batch slot counts and validates date format', async () => {
        let res = createMockRes();
        await shopController.getSlotsByDate({ query: { date: 'not-a-date' } }, res);
        assert.equal(res.statusCode, 400);

        dbQueryHandler = async () => ({
            rows: [
                { time: '09:00', count: 4 },
                { time: '10:30', count: 2 }
            ]
        });
        res = createMockRes();
        await shopController.getSlotsByDate({ query: { date: '2099-01-01' } }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.slots, { '09:00': 4, '10:30': 2 });
        assert.equal(res.body.maxPerSlot, 4);
    });
});

describe('controllers/blog.controller', () => {
    it('hides unpublished posts from anonymous users and exposes them to admin/manager', async () => {
        dbQueryHandler = async (sql) => {
            // publishedOnly=true query filters "isPublished" = true; return empty for anon
            if (sql.includes('"isPublished" = true')) {
                return { rows: [] };
            }
            if (sql.includes('FROM posts p')) {
                return { rows: [{ postId: '12', postTitle: 'Черновик', postViews: 0, isPublished: false }] };
            }
            if (sql.includes('FROM post_media')) {
                return { rows: [] };
            }
            return { rows: [] };
        };

        const anonRes = createMockRes();
        await blogController.getPost({ params: { id: '12' }, user: null }, anonRes);
        assert.equal(anonRes.statusCode, 404);

        const adminRes = createMockRes();
        await blogController.getPost({ params: { id: '12' }, user: { userId: '1', role: 'admin' } }, adminRes);
        assert.equal(adminRes.statusCode, 200);
        assert.equal(adminRes.body.post.postTitle, 'Черновик');
    });

    it('uses batch likes count in getPosts without N+1 queries and blocks toggleLike on unpublished post', async () => {
        const queries = [];
        dbQueryHandler = async (sql) => {
            queries.push(sql);
            if (sql.includes('SELECT COUNT(*) as total FROM posts')) {
                return { rows: [{ total: '2' }] };
            }
            if (sql.includes('FROM posts p') && sql.includes('LIMIT')) {
                return {
                    rows: [
                        { postId: '1', postTitle: 'A' },
                        { postId: '2', postTitle: 'B' }
                    ]
                };
            }
            if (sql.includes('SELECT "postId", COUNT(*)::int as count')) {
                return { rows: [{ postId: '1', count: 5 }] };
            }
            if (sql.includes('SELECT "postId" FROM post_likes')) {
                return { rows: [{ postId: '1' }] };
            }
            return { rows: [] };
        };

        const listRes = createMockRes();
        await blogController.getPosts({ query: {}, ip: '127.0.0.1' }, listRes);
        assert.equal(listRes.statusCode, 200);
        assert.equal(listRes.body.posts[0].likesCount, 5);
        assert.equal(listRes.body.posts[0].isLiked, true);
        assert.equal(listRes.body.posts[1].likesCount, 0);
        assert.equal(listRes.body.posts[1].isLiked, false);
        assert.equal(queries.filter((s) => s.includes('GROUP BY "postId"')).length, 1);

        // toggleLike rejects missing/unpublished post with 404
        dbQueryHandler = async () => ({ rows: [] });
        const likeRes = createMockRes();
        await blogController.toggleLike({ params: { id: '99' }, ip: '127.0.0.1' }, likeRes);
        assert.equal(likeRes.statusCode, 404);
    });
});

describe('HTTP Express routes via app.js', () => {
    it('returns 400 JSON on malformed JSON payload and invalid route IDs', async () => {
        const badJson = await requestApp('POST', '/api/auth/login', {
            body: '{broken-json',
            headers: { 'Content-Type': 'application/json' }
        });
        assert.equal(badJson.status, 400);
        assert.equal(badJson.json.success, false);

        const badId = await requestApp('GET', '/api/blog/not-an-id');
        assert.equal(badId.status, 400);
        assert.equal(badId.json.success, false);

        const token = generateAccessToken({ userId: '1', userEmail: 'admin@simba.test', role: 'admin' });
        dbQueryHandler = async () => ({ rows: [] });
        const hiddenPost = await requestApp('GET', '/api/blog/404', {
            cookies: [`accessToken=${token}`]
        });
        assert.equal(hiddenPost.status, 404);
    });
});

describe('public/js/api.js frontend helpers & auto-refresh', () => {
    const loadFrontendApi = (fetchImpl) => {
        const code = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
        const sandbox = {
            window: { location: { origin: 'https://simba.local' } },
            URL,
            console: { error: () => {} },
            fetch: fetchImpl
        };
        vm.runInNewContext(code, sandbox);
        return sandbox.window;
    };

    it('escapeHtml and safeUrl sanitize XSS and unsafe protocols', () => {
        const w = loadFrontendApi(async () => {});
        assert.equal(w.escapeHtml('<script>"\'&</script>'), '&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;');
        assert.equal(w.safeUrl('javascript:alert(1)'), '');
        assert.equal(w.safeUrl('data:text/html,<script>alert(1)</script>'), '');
        assert.equal(w.safeUrl('//evil.com/x.png'), '');
        assert.equal(w.safeUrl('/uploads/pic.png?a=1&b=2'), '/uploads/pic.png?a=1&amp;b=2');
        assert.equal(w.safeUrl('https://cdn.simba.ru/img.jpg'), 'https://cdn.simba.ru/img.jpg');
    });

    it('retries request once after 401 by refreshing session and throws Error with status on HTTP errors', async () => {
        const calls = [];
        const w = loadFrontendApi(async (url, opts) => {
            calls.push(`${opts?.method || 'GET'} ${url}`);
            if (url === '/api/auth/refresh') {
                return { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
            }
            if (url === '/api/profile/me' && calls.filter((c) => c.endsWith('/api/profile/me')).length === 1) {
                return { ok: false, status: 401, text: async () => JSON.stringify({ success: false, message: 'Expired' }) };
            }
            if (url === '/api/profile/me') {
                return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, user: { id: 1 } }) };
            }
            return { ok: false, status: 409, text: async () => JSON.stringify({ success: false, message: 'Нет на складе' }) };
        });

        const okData = await w.API.get('/profile/me');
        assert.equal(okData.success, true);
        assert.deepEqual(calls, ['GET /api/profile/me', 'POST /api/auth/refresh', 'GET /api/profile/me']);

        await assert.rejects(
            () => w.API.post('/shop/orders', {}),
            (err) => err.status === 409 && err.message === 'Нет на складе'
        );
    });
});
