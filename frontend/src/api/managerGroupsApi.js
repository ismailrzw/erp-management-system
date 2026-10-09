import api from './client';

export const managerGroupsApi = {
  getGroups: async (params = {}) => {
    const response = await api.get('/manager/groups/', { params });
    return response.data;
  },

  getGroupDetail: async (groupId) => {
    const response = await api.get(`/manager/groups/${groupId}`);
    return response.data;
  },

  approveGroup: async (groupId) => {
    const response = await api.post(`/manager/groups/${groupId}/approve`);
    return response.data;
  },

  rejectGroup: async (groupId, reason) => {
    const response = await api.post(`/manager/groups/${groupId}/reject`, { reason });
    return response.data;
  },

  sendMail: async (payload) => {
    const response = await api.post('/manager/groups/send-mail', payload);
    return response.data;
  },

  getWorkspace: async (groupId) => {
    const response = await api.get(`/manager/groups/${groupId}/workspace`);
    return response.data;
  },

  exportPerformance: async (groupId) => {
    const response = await api.get(`/manager/groups/${groupId}/export-performance`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

