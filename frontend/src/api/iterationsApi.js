import api from './client';

export const iterationsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/manager/iterations', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/iterations/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/iterations', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/iterations/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/iterations/${id}`);
    return response.data;
  },

  setRubrics: async (id, rubrics) => {
    const response = await api.post(`/manager/iterations/${id}/rubrics`, { rubrics });
    return response.data;
  },

  deleteRubric: async (iterationId, rubricId) => {
    const response = await api.delete(`/manager/iterations/${iterationId}/rubrics/${rubricId}`);
    return response.data;
  },
};
