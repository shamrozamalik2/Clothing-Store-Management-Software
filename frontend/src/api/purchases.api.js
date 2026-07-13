import client from './client';

export const purchasesApi = {
  list:          (params)          => client.get('/purchases', { params }),
  getOne:        (id)              => client.get(`/purchases/${id}`),
  create:        (data)            => client.post('/purchases', data),
  updateStatus:  (id, status)      => client.patch(`/purchases/${id}/status`, { status }),
  recordPayment: (id, data)        => client.post(`/purchases/${id}/payment`, data),
};
