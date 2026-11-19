const API_BASE = '/api';

const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const safeUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('//')) return '';
    if (trimmed.startsWith('/')) {
        return escapeHtml(trimmed);
    }
    try {
        const parsed = new URL(trimmed, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return escapeHtml(trimmed);
        }
    } catch (e) {
        return '';
    }
    return '';
};

let refreshPromise = null;
const AUTH_NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

class ApiClient {
    static async refreshSession() {
        if (!refreshPromise) {
            refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            })
                .then((res) => res.ok)
                .catch(() => false)
                .finally(() => {
                    refreshPromise = null;
                });
        }
        return refreshPromise;
    }

    static async parseResponse(response) {
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Ответ не JSON:', text.substring(0, 200));
            const err = new Error('Сервер вернул не JSON');
            err.status = response.status;
            throw err;
        }

        if (!response.ok) {
            const err = new Error(data?.message || `Ошибка ${response.status}`);
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    static async request(endpoint, options = {}, retried = false) {
        const config = {
            credentials: 'include',
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers }
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);

            if (response.status === 401 && !retried && !AUTH_NO_RETRY.some((p) => endpoint.startsWith(p))) {
                const refreshed = await this.refreshSession();
                if (refreshed) {
                    return this.request(endpoint, options, true);
                }
            }

            return await this.parseResponse(response);
        } catch (error) {
            if (!error.status) {
                console.error('API Error:', error);
            }
            throw error;
        }
    }

    static async get(endpoint) { return this.request(endpoint); }
    static async post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    static async put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
    static async delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }

    static async upload(endpoint, formData, retried = false) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (response.status === 401 && !retried) {
            const refreshed = await this.refreshSession();
            if (refreshed) {
                return this.upload(endpoint, formData, true);
            }
        }

        return this.parseResponse(response);
    }
}

window.API = ApiClient;
window.escapeHtml = escapeHtml;
window.safeUrl = safeUrl;
