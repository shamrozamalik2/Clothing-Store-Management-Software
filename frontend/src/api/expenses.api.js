import client from './client';

export const expensesApi = {
  list:           (params) => client.get('/expenses', { params }),
  categories:     ()       => client.get('/expenses/categories'),
  create:         (data)   => client.post('/expenses', data),
  update:         (id, d)  => client.patch(`/expenses/${id}`, d),
  remove:         (id)     => client.delete(`/expenses/${id}`),
};
