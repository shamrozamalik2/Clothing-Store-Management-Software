import client from './client';

export const rolesApi = {
  list:               ()           => client.get('/roles'),
  getOne:             (id)         => client.get(`/roles/${id}`),
  updatePermissions:  (id, perms)  => client.put(`/roles/${id}/permissions`, { permissions: perms }),
};
