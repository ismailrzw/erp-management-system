import api from './client';

export const attachmentsApi = {
  getAll: async () => {
    const response = await api.get('/manager/attachments/');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/attachments/${id}`);
    return response.data;
  },

  upload: async (formData) => {
    const response = await api.post('/manager/attachments/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id, title) => {
    const response = await api.put(`/manager/attachments/${id}`, { title });
    return response.data;
  },

  download: (id) => {
    const token = localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token');
    window.open(`/api/manager/attachments/${id}/download?token=${encodeURIComponent(token || '')}`, '_blank');
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/attachments/${id}`);
    return response.data;
  },
};
