import api from './client';

export const studentProfileApi = {
  getProfile: async () => {
    const response = await api.get('/student/profile/');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/student/profile/', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const response = await api.post('/student/profile/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return response.data;
  },
};
