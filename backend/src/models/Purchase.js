'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

// Embedded purchase item
const purchaseItemSchema = new Schema(
  {
    product_id:   { type: Types.ObjectId, ref: 'Product', default: null },
    variant_id:   { type: Types.ObjectId, default: null },
    product_name: { type: String, required: true },
    sku:          { type: String },
    quantity:     { type: Number, required: true },
    unit_cost:    { type: Number, required: true },
    discount:     { type: Number, default: 0 },
    tax_amount:   { type: Number, default: 0 },
    total:        { type: Number, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, _id: true }
);
purchaseItemSchema.plugin(basePlugin);

const purchaseSchema = new Schema(
  {
    company_id:      { type: Types.ObjectId, ref: 'Company',  required: true },
    branch_id:       { type: Types.ObjectId, ref: 'Branch',   default: null },
    supplier_id:     { type: Types.ObjectId, ref: 'Supplier', default: null },
    reference:       { type: String, required: true },
    status:          { type: String, default: 'ordered', enum: ['ordered', 'received', 'partial', 'cancelled'] },
    purchase_date:   { type: Date, default: Date.now },
    due_date:        { type: Date, default: null },
    subtotal:        { type: Number, default: 0 },
    tax_amount:      { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount:    { type: Number, default: 0 },
    paid_amount:     { type: Number, default: 0 },
    due_amount:      { type: Number, default: 0 },
    notes:           { type: String },
    created_by:      { type: Types.ObjectId, ref: 'User', default: null },
    items:           { type: [purchaseItemSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

purchaseSchema.index({ company_id: 1 });
purchaseSchema.index({ company_id: 1, reference: 1 }, { unique: true });
purchaseSchema.index({ company_id: 1, purchase_date: -1 });
purchaseSchema.index({ company_id: 1, supplier_id: 1 });
purchaseSchema.plugin(basePlugin);

module.exports = model('Purchase', purchaseSchema);
