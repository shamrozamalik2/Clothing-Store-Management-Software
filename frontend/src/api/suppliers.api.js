import client from './client';

export const suppliersApi = {
  list:    (params) => client.get('/suppliers', { params }),
  flat:    ()       => client.get('/suppliers', { params: { flat: '1' } }),
  getOne:  (id)     => client.get(`/suppliers/${id}`),
  create:  (data)   => client.post('/suppliers', data),
  update:  (id, data) => client.put(`/suppliers/${id}`, data),
  remove:    (id)     => client.delete(`/suppliers/${id}`),
  importCsv: (file)  => { const fd = new FormData(); fd.append('file', file); return client.post('/suppliers/import', fd, { headers: { 'Content-Type': undefined } }); },
};
