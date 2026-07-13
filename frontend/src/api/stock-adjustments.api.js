import client from './client';

export const stockAdjApi = {
  list:   (params) => client.get('/stock-adjustments', { params }),
  getOne: (id)     => client.get(`/stock-adjustments/${id}`),
  create: (data)   => client.post('/stock-adjustments', data),
};
