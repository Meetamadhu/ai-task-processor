// src/services/api.js
import axios from 'axios';

/**
 * Default: same-origin `/api` on Vercel (rewrites proxy to Render — avoids CORS).
 * Local dev: `http://localhost:5000/api` unless REACT_APP_API_URL is set.
 * Override: set REACT_APP_API_URL to full URL (cross-origin; backend CORS must allow your UI).
 */
function resolveApiBaseUrl() {
  const fromEnv = (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return fromEnv || 'http://localhost:5000/api';
    }
    if (fromEnv) return fromEnv;
    return `${origin}/api`.replace(/\/$/, '');
  }
  return fromEnv || 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const reqUrl = String(error.config?.url || '');
      if (reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register')) {
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

// Auth API calls
export const authAPI = {
  register: (email, password, name) => 
    api.post('/auth/register', { email, password, name }),
  login: (email, password) => 
    api.post('/auth/login', { email, password })
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
