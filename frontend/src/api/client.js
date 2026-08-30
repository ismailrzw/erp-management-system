import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, delete Content-Type to let browser/axios set multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token expiration / 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('pbl_token');
      localStorage.removeItem('pbl_user');
      sessionStorage.removeItem('pbl_token');
      sessionStorage.removeItem('pbl_user');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
