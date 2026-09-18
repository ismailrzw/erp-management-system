import api from './client';

export const rubricTemplatesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/manager/rubric-templates', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/rubric-templates/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/rubric-templates', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/rubric-templates/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/rubric-templates/${id}`);
    return response.data;
  },
};
