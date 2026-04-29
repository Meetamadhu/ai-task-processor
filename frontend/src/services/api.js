// src/services/api.js
import axios from 'axios';

/**
 * Default: same-origin `/api` on Vercel (rewrites proxy to Render — avoids CORS).
 * Local dev: `http://localhost:5000/api` unless REACT_APP_API_URL is set.
 * On a deployed host, if REACT_APP_API_URL points at another origin (e.g. Render), it is ignored
 * and same-origin `/api` is used so vercel.json rewrites handle the hop.
 */
function normalizeEnvApiUrl(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^["']+|["']+$/g, '').trim();
  s = s.replace(/[,.;]+$/g, '').trim();
  s = s.replace(/\/$/, '');
  return s;
}

function resolveApiBaseUrl() {
  const fromEnv = normalizeEnvApiUrl(process.env.REACT_APP_API_URL);
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return fromEnv || 'http://localhost:5000/api';
    }
    const sameOriginApi = `${origin}/api`.replace(/\/$/, '');
    if (!fromEnv) return sameOriginApi;
    try {
      const u = new URL(fromEnv);
      if (u.origin !== origin) return sameOriginApi;
      return fromEnv;
    } catch {
      return sameOriginApi;
    }
  }
  return fromEnv || 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

function isAuthLoginOrRegister(config) {
  const path = String(config?.url || '');
  const base = String(config?.baseURL || '');
  const combined = `${base}${path}`;
  return /\/auth\/(login|register)(\?|$|#)/.test(path) || /\/auth\/(login|register)(\?|$|#)/.test(combined);
}

export function getApiErrorMessage(err, fallback) {
  const status = err.response?.status;
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);
  if (status === 429) {
    return 'Too many requests. Wait a few minutes and try again.';
  }
  const network = err.code === 'ERR_NETWORK' || err.message === 'Network Error';
  if (network) {
    const base = resolveApiBaseUrl();
    const deployed =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    const hint = deployed
      ? ' Confirm vercel.json rewrites /api to your backend. Remove REACT_APP_API_URL from Vercel if it points at Render (use same-origin /api).'
      : ' Start the backend or set REACT_APP_API_URL in frontend/.env.local (e.g. http://localhost:5000/api).';
    return `Cannot reach the API (${base}).${hint}`;
  }
  return err.message || fallback;
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
let redirecting401 = false;
api.interceptors.response.use(
  (response) => {
    redirecting401 = false;
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const cfg = error.config;
      if (isAuthLoginOrRegister(cfg)) {
        return Promise.reject(error);
      }
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path === '/login' || path === '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return Promise.reject(error);
      }
      if (redirecting401) return Promise.reject(error);
      redirecting401 = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth: clear stale session before login/register so the request interceptor never attaches an old JWT.
export const authAPI = {
  register: (email, password, name) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return api.post('/auth/register', { email, password, name });
  },
  login: (email, password) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return api.post('/auth/login', { email, password });
  }
};

// Task API calls
export const taskAPI = {
  createTask: (title, inputText, operation) =>
    api.post('/tasks', { title, inputText, operation }),
  getTasks: (status, limit = 50, skip = 0) =>
    api.get('/tasks', { params: { status, limit, skip } }),
  getTask: (taskId) =>
    api.get(`/tasks/${taskId}`),
  getTaskLogs: (taskId) =>
    api.get(`/tasks/${taskId}/logs`),
  deleteTask: (taskId) =>
    api.delete(`/tasks/${taskId}`)
};

export default api;
