import client from './client';

export const expensesApi = {
  list:           (params) => client.get('/expenses', { params }),
  categories:     ()       => client.get('/expenses/categories'),
  create:         (data)   => client.post('/expenses', data),
  update:         (id, d)  => client.patch(`/expenses/${id}`, d),
  remove:                (id)   => client.delete(`/expenses/${id}`),
  importCsv:             (file) => { const fd = new FormData(); fd.append('file', file); return client.post('/expenses/import', fd, { headers: { 'Content-Type': undefined } }); },
  importCategoriesCsv:   (file) => { const fd = new FormData(); fd.append('file', file); return client.post('/expenses/categories/import', fd, { headers: { 'Content-Type': undefined } }); },
};
