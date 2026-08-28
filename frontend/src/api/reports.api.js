import client from './client';

export const reportsApi = {
  dashboard:        ()       => client.get('/reports/dashboard'),
  overview:         (params) => client.get('/reports/overview',          { params }),
  dailySales:       (params) => client.get('/reports/daily-sales',       { params }),
  paymentMethods:   (params) => client.get('/reports/payment-methods',   { params }),
  topProducts:      (params) => client.get('/reports/top-products',      { params }),
  topCustomers:     (params) => client.get('/reports/top-customers',     { params }),
  stockValuation:   ()       => client.get('/reports/stock-valuation'),
  purchasesSummary: (params) => client.get('/reports/purchases-summary', { params }),
  staff:            (params) => client.get('/reports/staff',             { params }),
};
