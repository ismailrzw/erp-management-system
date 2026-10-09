import api from './client';

export const studentIterationsApi = {
  unsubmit: async (id, expected_submission) => (await api.post(`/student/iterations/${id}/unsubmit`, { expected_submission })).data,
  getAll: async () => {
    const response = await api.get('/student/iterations');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/student/iterations/${id}`);
    return response.data;
  },

  submit: async (iterationId, formData, signal) => {
    const response = await api.post(`/student/iterations/${iterationId}/submit`, formData, { signal });
    return response.data;
  },
};
