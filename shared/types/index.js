// Shared constants used by both frontend and backend (when referenced at build time)
// Backend uses constants.js directly; this file is for frontend references.

export const ROLES = {
  ADMIN:   'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
};

export const PAYMENT_METHODS = {
  CASH:  'cash',
  CARD:  'card',
  SPLIT: 'split',
  CREDIT:'credit',
};

export const SALE_STATUS = {
  COMPLETED: 'completed',
  RETURNED:  'returned',
  CANCELLED: 'cancelled',
  LAYAWAY:   'layaway',
};

export const PURCHASE_STATUS = {
  ORDERED:   'ordered',
  RECEIVED:  'received',
  RETURNED:  'returned',
  CANCELLED: 'cancelled',
};
