import api from './client';

export const studentGroupApi = {
  getMyGroup: async () => {
    const response = await api.get('/student/groups/my');
    return response.data;
  },

  createGroup: async (data) => {
    const response = await api.post('/student/groups/', data);
    return response.data;
  },

  updateGroup: async (groupId, data) => {
    const response = await api.put(`/student/groups/${groupId}`, data);
    return response.data;
  },

  leaveGroup: async (groupId) => {
    const response = await api.post(`/student/groups/${groupId}/leave`);
    return response.data;
  },

  removeMember: async (groupId, memberId) => {
    const response = await api.post(`/student/groups/${groupId}/remove/${memberId}`);
    return response.data;
  },

  transferLeadership: async (groupId, newLeaderId) => {
    const response = await api.post(`/student/groups/${groupId}/transfer-leadership`, {
      new_leader_id: newLeaderId,
    });
    return response.data;
  },

  inviteMember: async (groupId, roll) => {
    const response = await api.post(`/student/groups/${groupId}/invite`, { roll });
    return response.data;
  },

  getPendingInvitations: async () => {
    const response = await api.get('/student/invitations/pending');
    return response.data;
  },

  acceptInvitation: async (invitationId) => {
    const response = await api.post(`/student/invitations/${invitationId}/accept`);
    return response.data;
  },

  declineInvitation: async (invitationId) => {
    const response = await api.post(`/student/invitations/${invitationId}/decline`);
    return response.data;
  },

  searchStudents: async (rollQuery) => {
    const response = await api.get('/student/students/search/', {
      params: { roll: rollQuery },
    });
    return response.data;
  },
};
