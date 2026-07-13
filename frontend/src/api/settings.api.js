import client from './client';

export const settingsApi = {
  getAll:     ()           => client.get('/settings'),
  getOne:     (key)        => client.get(`/settings/${key}`),
  updateBulk: (data)       => client.put('/settings', data),
  updateOne:  (key, value) => client.put(`/settings/${key}`, { value }),
};
