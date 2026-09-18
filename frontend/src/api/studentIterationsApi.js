import api from './client';

export const studentIterationsApi = {
  getAll: async () => {
    const response = await api.get('/student/iterations');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/student/iterations/${id}`);
    return response.data;
  },

  submit: async (iterationId, formData) => {
    const response = await api.post(`/student/iterations/${iterationId}/submit`, formData);
    return response.data;
  },
};
