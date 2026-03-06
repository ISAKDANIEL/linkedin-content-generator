import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

function getToken() {
    return localStorage.getItem('ucc_token');
}

function authHeaders() {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

const api = axios.create({ baseURL: API_BASE });

// ── Auth API ──────────────────────────────────────────────────────────────────
function throwApiError(err) {
    const msg = err.response?.data?.error || err.message || 'Something went wrong';
    const status = err.response?.status;
    const error = new Error(msg);
    error.status = status;
    throw error;
}

export const authAPI = {
    async login(email, password) {
        try {
            const res = await api.post('/auth/login', { email, password });
            return res.data;
        } catch (err) { throwApiError(err); }
    },
    async register(email, password, name) {
        try {
            const res = await api.post('/auth/register', { email, password, name });
            return res.data;
        } catch (err) { throwApiError(err); }
    },
    async me() {
        try {
            const res = await api.get('/auth/me', { headers: authHeaders() });
            return res.data;
        } catch (err) { throwApiError(err); }
    },
};

// ── Content API ───────────────────────────────────────────────────────────────
export async function generateContent({ title, tone, audience, style }) {
    try {
        const res = await api.post(
            '/api/generate',
            { title, tone, audience, style },
            { headers: authHeaders() }
        );
        return res.data;
    } catch (err) {
        const msg = err.response?.data?.error || err.message;
        throw new Error(msg);
    }
}

// ── History API ───────────────────────────────────────────────────────────────
export const historyAPI = {
    async getAll() {
        const res = await api.get('/api/history', { headers: authHeaders() });
        return res.data;
    },
    async getById(id) {
        const res = await api.get(`/api/history/${id}`, { headers: authHeaders() });
        return res.data;
    },
    async delete(id) {
        const res = await api.delete(`/api/history/${id}`, { headers: authHeaders() });
        return res.data;
    },
};
