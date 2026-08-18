import client from './client';

export const rolesApi = {
  list:              ()          => client.get('/roles'),
  getOne:            (id)        => client.get(`/roles/${id}`),
  create:            (label)     => client.post('/roles', { label }),
  updatePermissions: (id, perms) => client.put(`/roles/${id}/permissions`, { permissions: perms }),
};
