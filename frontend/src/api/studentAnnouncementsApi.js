import api from './client';

export const studentAnnouncementsApi = {
  getAll: async () => {
    const response = await api.get('/student/announcements/');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/student/announcements/${id}`);
    return response.data;
  },

  markAsViewed: async (id) => {
    const response = await api.post(`/student/announcements/${id}/view`);
    return response.data;
  },

  markAllAsViewed: async () => {
    const response = await api.post('/student/announcements/view-all');
    return response.data;
  },
};
