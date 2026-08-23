import api from './client';

export const coursesApi = {
  list: async (params = {}) => {
    const response = await api.get('/manager/courses/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/courses/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/courses/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/courses/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/courses/${id}`);
    return response.data;
  },

  restore: async (id) => {
    const response = await api.post(`/manager/courses/${id}/restore`);
    return response.data;
  },
};
