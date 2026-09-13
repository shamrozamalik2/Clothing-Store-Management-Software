'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

saleSchema.index({ company_id: 1 });
saleSchema.index({ company_id: 1, reference: 1 }, { unique: true });
saleSchema.index({ company_id: 1, sale_date: -1 });
saleSchema.index({ company_id: 1, customer_id: 1 });
saleSchema.index({ company_id: 1, status: 1, sale_date: -1 });
saleSchema.plugin(basePlugin);

module.exports = model('Sale', saleSchema);
