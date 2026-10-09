import api from './client';

export const studentAnnouncementsApi = {
  markAsViewed: async (id) => {
    const response = await api.post(`/student/announcements/${id}/view`);
    return response.data;
  },

  markAllAsViewed: async () => {
    const response = await api.post('/student/announcements/view-all');
    return response.data;
  },
};
