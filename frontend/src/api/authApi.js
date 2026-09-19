import api from './client';

export const authApi = {
  login: async (emailOrRoll, password) => {
    const response = await api.post('/auth/login', {
      email_or_roll: emailOrRoll,
      password,
    });
    return response.data;
  },

  setPassword: async (token, newPassword) => {
    const response = await api.post('/auth/set-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
