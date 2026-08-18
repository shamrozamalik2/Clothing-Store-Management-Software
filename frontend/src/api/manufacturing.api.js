import client from './client';

export const manufacturingApi = {
  // BOM
  listBOM:      (params) => client.get('/manufacturing/bom', { params }),
  createBOM:    (data)   => client.post('/manufacturing/bom', data),
  deleteBOM:    (id)     => client.delete(`/manufacturing/bom/${id}`),
  // Products
  listProducts: (params) => client.get('/manufacturing/products', { params }),
  // Batches
  listBatches:  (params) => client.get('/manufacturing/batches', { params }),
  getBatch:     (id)     => client.get(`/manufacturing/batches/${id}`),
  createBatch:  (data)   => client.post('/manufacturing/batches', data),
};
