import api from './client';

export const studentsApi = {
  list: async (params = {}) => {
    const response = await api.get('/manager/students/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/students/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/students/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/students/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/students/${id}`);
    return response.data;
  },

  restore: async (id) => {
    const response = await api.post(`/manager/students/${id}/restore`);
    return response.data;
  },

  bulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Let axios automatically set the correct multipart/form-data headers with boundary
    const response = await api.post('/manager/students/bulk-import', formData);
    return response.data;
  },
};
