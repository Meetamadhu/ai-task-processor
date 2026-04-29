// src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
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
