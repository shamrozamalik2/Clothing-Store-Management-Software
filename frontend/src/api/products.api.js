import client from './client';

export const productsApi = {
  list:          (params) => client.get('/products', { params }),
  lowStock:      ()       => client.get('/products/low-stock'),
  getOne:        (id)     => client.get(`/products/${id}`),
  getByBarcode:  (code)   => client.get(`/products/barcode/${encodeURIComponent(code)}`),
  create:        (data)   => client.post('/products', data),
  update:        (id, data) => client.put(`/products/${id}`, data),
  remove:        (id)     => client.delete(`/products/${id}`),

  // Variants
  listVariants:   (id)          => client.get(`/products/${id}/variants`),
  addVariant:     (id, data)    => client.post(`/products/${id}/variants`, data),
  updateVariant:  (id, vid, d)  => client.put(`/products/${id}/variants/${vid}`, d),
  deleteVariant:  (id, vid)     => client.delete(`/products/${id}/variants/${vid}`),
};
