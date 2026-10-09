import api from './client';

export async function downloadFile(url, filename = 'document') {
  if (!url?.startsWith('/api/')) throw new Error('The file reference is unavailable. Refresh the page.');
  const result = await api.get(url.slice(4), { responseType: 'blob', skipCache: true });
  const objectUrl = URL.createObjectURL(result.data);
  const link = document.createElement('a');
  link.href = objectUrl; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
