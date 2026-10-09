import api from './client';

export const teacherPortalApi = {
  getDashboard: async () => {
    const response = await api.get('/teacher/dashboard');
    return response.data;
  },

  getGroups: async (params = {}) => {
    const response = await api.get('/teacher/groups', { params });
    return response.data;
  },

  getGroupDetail: async (groupId) => {
    const response = await api.get(`/teacher/groups/${groupId}`);
    return response.data;
  },

  getStudents: async (params = {}) => {
    const response = await api.get('/teacher/students', { params });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/teacher/profile');
    return response.data;
  },

  updateDomains: async (domains) => {
    const response = await api.put('/teacher/profile/domains', { domains });
    return response.data;
  },

  getSupervisorRequests: async () => {
    const response = await api.get('/teacher/supervisor-requests');
    return response.data;
  },

  acceptSupervisorRequest: async (requestId) => {
    const response = await api.post(`/teacher/supervisor-requests/${requestId}/accept`);
    return response.data;
  },

  rejectSupervisorRequest: async (requestId, reason = '') => {
    const response = await api.post(`/teacher/supervisor-requests/${requestId}/reject`, { reason });
    return response.data;
  },
};
