import api from './client';

export const departmentsApi = {
  list: async (params = {}) => {
    const response = await api.get('/manager/departments/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/departments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/departments/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/departments/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/departments/${id}`);
    return response.data;
  },

  restore: async (id) => {
    const response = await api.post(`/manager/departments/${id}/restore`);
    return response.data;
  },
};
