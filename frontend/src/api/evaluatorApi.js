// frontend/src/api/evaluatorApi.js
import api from './client';

export const evaluatorApi = {
  getDashboard: () => api.get('/evaluator/dashboard'),
  getAssignedGroups: () => api.get('/evaluator/groups'),
  getGroupDetail: (groupId) => api.get(`/evaluator/groups/${groupId}`),
  submitEvaluation: (data) => api.post('/evaluator/evaluations', data),
  getEvaluations: (groupId, iterationId) => {
    const params = new URLSearchParams();
    if (groupId) params.append('group_id', groupId);
    if (iterationId) params.append('iteration_id', iterationId);
    const query = params.toString();
    return api.get(`/evaluator/evaluations${query ? `?${query}` : ''}`);
  },
  getMeetings: (groupId) => {
    const query = groupId ? `?group_id=${groupId}` : '';
    return api.get(`/evaluator/meetings${query}`);
  },
  logMeeting: (data) => api.post('/evaluator/meetings', data),
  getGroupRubrics: (groupId) => api.get(`/evaluator/groups/${groupId}/rubrics`),
  saveGroupRubrics: (groupId, rubrics) => api.post(`/evaluator/groups/${groupId}/rubrics`, { rubrics }),
  listSupervisorRequests: async () => { const r = await api.get('/evaluator/supervisor-requests'); return r.data; },
  acceptSupervisorRequest: async (id) => { const r = await api.post(`/evaluator/supervisor-requests/${id}/accept`); return r.data; },
  rejectSupervisorRequest: async (id, reason) => { const r = await api.post(`/evaluator/supervisor-requests/${id}/reject`, { reason }); return r.data; },
};
