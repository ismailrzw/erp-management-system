// frontend/src/api/sprintsApi.js
import api from './client';

export const sprintsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/manager/sprints', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/sprints/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/sprints', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/sprints/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/sprints/${id}`);
    return response.data;
  },
};
