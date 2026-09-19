import axios from 'axios';
import { apiCache } from './apiCache';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache wrapper for GET requests: provides 0ms responses for seamless navigation
const originalGet = api.get.bind(api);
api.get = async function (url, config = {}) {
  const shouldSkipCache =
    config.skipCache === true ||
    config.params?._refresh === true ||
    config.headers?.['Cache-Control'] === 'no-cache';

  // If cache is enabled, check for cached entry
  if (!shouldSkipCache) {
    const cached = apiCache.get(url, config.params);
    if (cached && !cached.isStale) {
      // 0ms instant cache hit
      return Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        fromCache: true,
      });
    }

    // Stale-While-Revalidate: Return stale data instantly and revalidate in the background
    if (cached && cached.isStale) {
      originalGet(url, config)
        .then((freshRes) => {
          if (freshRes?.data) {
            apiCache.set(url, config.params, freshRes.data);
          }
        })
        .catch(() => {});

      return Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        fromCache: true,
        isStale: true,
      });
    }
  }

  // Network fetch
  const response = await originalGet(url, config);
  if (response?.data && !shouldSkipCache) {
    apiCache.set(url, config.params, response.data);
  }
  return response;
};

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

// Response interceptor: handle token expiration / 401 & automatic mutation invalidation
api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      apiCache.invalidateForMutation(method, response.config?.url);
    }
    return response;
  },
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isAuthRequest) {
      apiCache.clear();
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
