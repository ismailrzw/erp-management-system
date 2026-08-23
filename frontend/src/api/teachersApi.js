import api from './client';

export const teachersApi = {
  list: async (params = {}) => {
    const response = await api.get('/manager/teachers/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/teachers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/teachers/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/teachers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/teachers/${id}`);
    return response.data;
  },

  restore: async (id) => {
    const response = await api.post(`/manager/teachers/${id}/restore`);
    return response.data;
  },
};
