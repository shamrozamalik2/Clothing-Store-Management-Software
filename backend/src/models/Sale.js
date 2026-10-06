'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

// Which lots a batch-tracked line was taken from. `restored` is how much has gone
// back into that lot through returns or a void, so the same units are never restored twice.
const batchAllocationSchema = new Schema(
  {
    batch_id:    { type: Types.ObjectId, ref: 'StockBatch', required: true },
    batch_no:    { type: String, default: null },
    expiry_date: { type: Date, default: null },
    quantity:    { type: Number, required: true },
    restored:    { type: Number, default: 0 },
  },
  { _id: false }
);

// Embedded sale item
const saleItemSchema = new Schema(
  {
    product_id:   { type: Types.ObjectId, ref: 'Product', default: null },
    variant_id:   { type: Types.ObjectId, default: null },
    product_name: { type: String, required: true },
    sku:          { type: String },
    quantity:     { type: Number, required: true },
    unit_price:   { type: Number, required: true },
    cost_price:   { type: Number, default: 0 },
    discount:     { type: Number, default: 0 },
    tax_amount:   { type: Number, default: 0 },
    total:        { type: Number, required: true },
    batch_allocations: { type: [batchAllocationSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, _id: true }
);
saleItemSchema.plugin(basePlugin);

const saleSchema = new Schema(
  {
    company_id:      { type: Types.ObjectId, ref: 'Company',  required: true },
    branch_id:       { type: Types.ObjectId, ref: 'Branch',   default: null },
    customer_id:     { type: Types.ObjectId, ref: 'Customer', default: null },
    reference:       { type: String, required: true },
    status:          { type: String, default: 'completed', enum: ['completed', 'pending', 'cancelled'] },
    sale_date:       { type: Date, default: Date.now },
    subtotal:        { type: Number, default: 0 },
    tax_amount:      { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount:    { type: Number, required: true },
    paid_amount:     { type: Number, default: 0 },
    change_amount:   { type: Number, default: 0 },
    due_amount:      { type: Number, default: 0 },
    payment_method:  { type: String, default: 'cash' },
    notes:           { type: String },
    created_by:      { type: Types.ObjectId, ref: 'User', default: null },
    items:           { type: [saleItemSchema], default: [] },
    // Client-generated key for one checkout attempt. A retried/double-submitted
    // request carrying the same key is treated as a replay of an already-completed
    // sale rather than a new one — see sales.controller.js#create.
    idempotency_key: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

saleSchema.index({ company_id: 1 });
saleSchema.index({ company_id: 1, reference: 1 }, { unique: true });
// Partial: only applies when idempotency_key is an actual string, so sales
// without one (older clients, or any future caller that omits it) never collide.
saleSchema.index(
  { company_id: 1, idempotency_key: 1 },
  { unique: true, partialFilterExpression: { idempotency_key: { $type: 'string' } } }
);
saleSchema.index({ company_id: 1, sale_date: -1 });
saleSchema.index({ company_id: 1, customer_id: 1 });
saleSchema.index({ company_id: 1, status: 1, sale_date: -1 });
saleSchema.plugin(basePlugin);

module.exports = model('Sale', saleSchema);
