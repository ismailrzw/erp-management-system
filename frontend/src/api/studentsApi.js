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

  permanentDelete: async (id) => {
    const response = await api.delete(`/manager/students/${id}/permanent`);
    return response.data;
  },

  resendPasswordEmail: async (id) => {
    const response = await api.post(`/manager/students/${id}/resend-password-email`);
    return response.data;
  },

  getUngrouped: async (params = {}) => {
    const response = await api.get('/manager/students/ungrouped', { params });
    return response.data;
  },

  exportUngrouped: async (params = {}) => {
    const response = await api.get('/manager/students/ungrouped/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  notifyUngrouped: async (data = {}) => {
    const response = await api.post('/manager/students/notify-ungrouped', data);
    return response.data;
  },

  bulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/manager/students/bulk-import', formData);
    return response.data;
  },
};
