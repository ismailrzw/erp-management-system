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
  getExhibitionGroups: () => api.get('/evaluator/exhibition'),
  submitExhibitionEval: (data) => api.post('/evaluator/exhibition', data),
  getMeetings: (groupId) => {
    const query = groupId ? `?group_id=${groupId}` : '';
    return api.get(`/evaluator/meetings${query}`);
  },
  logMeeting: (data) => api.post('/evaluator/meetings', data),
};
