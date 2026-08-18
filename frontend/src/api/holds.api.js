import client from './client';
export const holdsApi = {
  list:   ()         => client.get('/holds'),
  create: (data)     => client.post('/holds', data),
  remove: (id)       => client.delete(`/holds/${id}`),
};
