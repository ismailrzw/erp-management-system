import api from './client';

export const reportsApi = {
  downloadGroupReport: async (params = {}) => {
    const response = await api.get('/manager/reports/groups', {
      params,
      responseType: 'blob',
    });
    return response;
  },
};
