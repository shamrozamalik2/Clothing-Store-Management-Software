import client from './client';

export const returnsApi = {
  list:   (params) => client.get('/returns', { params }),
  getOne: (id)     => client.get(`/returns/${id}`),
  create: (data)   => client.post('/returns', data),
};
