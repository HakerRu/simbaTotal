const API_BASE = '/api';

class ApiClient {
    static async request(endpoint, options = {}) {
        const config = {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include',
            ...options
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const text = await response.text();

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Ответ не JSON:', text.substring(0, 200));
                throw new Error('Сервер вернул не JSON');
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async get(endpoint) { return this.request(endpoint); }
    static async post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    static async put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
    static async delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }

    static async upload(endpoint, formData) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        return response.json();
    }
}

window.API = ApiClient;