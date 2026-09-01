import api from './client';

export const studentAttachmentsApi = {
  getAll: async () => {
    const response = await api.get('/student/attachments/');
    return response.data;
  },

  download: async (id, filename) => {
    const response = await api.get(`/student/attachments/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'attachment');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};
