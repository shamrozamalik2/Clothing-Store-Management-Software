import client from './client';

export const ledgerApi = {
  customersSummary: (params) => client.get('/ledger/customers', { params }),
  customerLedger:   (id, params) => client.get(`/ledger/customers/${id}`, { params }),
  suppliersSummary: (params) => client.get('/ledger/suppliers', { params }),
  supplierLedger:   (id, params) => client.get(`/ledger/suppliers/${id}`, { params }),
  arApSummary:      ()       => client.get('/ledger/ar-ap'),
};
