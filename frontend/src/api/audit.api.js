import client from './client';
export const auditApi = { list: (params) => client.get('/audit', { params }) };
