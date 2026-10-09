import api from './client';

export const evaluatorsApi = {
  resendActivation: async (id) => (await api.post(`/manager/evaluators/${id}/resend-activation`)).data,
  list: async (params = {}) => {
    const response = await api.get('/manager/evaluators/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/manager/evaluators/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/manager/evaluators/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/manager/evaluators/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/manager/evaluators/${id}`);
    return response.data;
  },

  restore: async (id) => {
    const response = await api.post(`/manager/evaluators/${id}/restore`);
    return response.data;
  },

  permanentDelete: async (id) => {
    const response = await api.delete(`/manager/evaluators/${id}/permanent`);
    return response.data;
  },

  updateDomains: async (id, domains) => {
    const response = await api.put(`/manager/evaluators/${id}/domains`, { domains });
    return response.data;
  },
};
