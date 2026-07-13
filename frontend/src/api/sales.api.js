import client from './client';

export const salesApi = {
  list:      (params) => client.get('/sales', { params }),
  today:     ()       => client.get('/sales/today'),
  getOne:    (id)     => client.get(`/sales/${id}`),
  create:    (data)   => client.post('/sales', data),
  voidSale:  (id)     => client.patch(`/sales/${id}/void`),
};
