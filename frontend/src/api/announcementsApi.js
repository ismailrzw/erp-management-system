import api from './client';

export const announcementsApi = {
  create: async (data) => {
    const response = await api.post('/manager/announcements/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/announcements/${id}`);
    return response.data;
  },
};
