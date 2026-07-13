import client from './client';

export const usersApi = {
  list:          (params) => client.get('/users', { params }),
  getOne:        (id)     => client.get(`/users/${id}`),
  create:        (data)   => client.post('/users', data),
  update:        (id, data) => client.put(`/users/${id}`, data),
  remove:        (id)     => client.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => client.patch(`/users/${id}/reset-password`, { newPassword }),
  toggleStatus:  (id)     => client.patch(`/users/${id}/toggle-status`),
  uploadAvatar:  (file)   => {
    const fd = new FormData();
    fd.append('avatar', file);
    return client.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
