import api from './client';

export const studentDashboardApi = {
  getDashboard: async () => {
    const response = await api.get('/student/dashboard/');
    return response.data;
  },
};
