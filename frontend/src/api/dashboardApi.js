import api from './client';

export const dashboardApi = {
  getManagerDashboard: async () => {
    const response = await api.get('/manager/dashboard/');
    return response.data;
  },
};
