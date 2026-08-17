import client from './client';

export const brandsApi = {
  list:    (params) => client.get('/brands', { params }),
  flat:    ()       => client.get('/brands', { params: { flat: '1' } }),
  getOne:  (id)     => client.get(`/brands/${id}`),
  create:  (data)   => client.post('/brands', data),
  update:  (id, data) => client.put(`/brands/${id}`, data),
  remove:    (id)     => client.delete(`/brands/${id}`),
  importCsv: (file)  => { const fd = new FormData(); fd.append('file', file); return client.post('/brands/import', fd, { headers: { 'Content-Type': undefined } }); },
};
