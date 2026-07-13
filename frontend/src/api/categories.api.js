import client from './client';

export const categoriesApi = {
  list:    (params) => client.get('/categories', { params }),
  flat:    ()       => client.get('/categories', { params: { flat: '1' } }),
  getOne:  (id)     => client.get(`/categories/${id}`),
  create:  (data)   => client.post('/categories', data),
  update:  (id, data) => client.put(`/categories/${id}`, data),
  remove:  (id)     => client.delete(`/categories/${id}`),
};
