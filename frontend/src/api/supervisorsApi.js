import api from './client';

export const supervisorsApi = {
  // Student-facing endpoints
  listAvailable: async (params = {}) => {
    const response = await api.get('/student/supervisors/', { params });
    return response.data;
  },

  getMyRequest: async () => {
    const response = await api.get('/student/supervisor-requests/my');
    return response.data;
  },

  createRequest: async (data) => {
    const response = await api.post('/student/supervisor-requests/', data);
    return response.data;
  },

  cancelRequest: async (requestId) => {
    const response = await api.delete(`/student/supervisor-requests/${requestId}`);
    return response.data;
  },

  // Evaluator-facing endpoints
  listEvaluatorRequests: async () => {
    const response = await api.get('/evaluator/supervisor-requests/');
    return response.data;
  },

  acceptRequest: async (requestId) => {
    const response = await api.post(`/evaluator/supervisor-requests/${requestId}/accept`);
    return response.data;
  },

  rejectRequest: async (requestId, reason = '') => {
    const response = await api.post(`/evaluator/supervisor-requests/${requestId}/reject`, { reason });
    return response.data;
  },

  updateEvaluatorDomains: async (domains) => {
    const response = await api.put('/evaluator/profile/domains', { domains });
    return response.data;
  },

  // Manager-facing endpoints
  updateTeacherDomains: async (teacherId, domains) => {
    const response = await api.put(`/manager/teachers/${teacherId}/domains`, { domains });
    return response.data;
  },
};
