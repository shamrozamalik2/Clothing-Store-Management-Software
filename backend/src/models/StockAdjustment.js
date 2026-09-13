'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const adjItemSchema = new Schema(
  {
    product_id:        { type: Types.ObjectId, ref: 'Product', default: null },
    variant_id:        { type: Types.ObjectId, default: null },
    product_name:      { type: String, required: true },
    sku:               { type: String },
    quantity_before:   { type: Number, default: 0 },
    quantity_adjusted: { type: Number, required: true },
    quantity_after:    { type: Number, default: 0 },
    unit_cost:         { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, _id: true }
);
adjItemSchema.plugin(basePlugin);

const stockAdjSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    branch_id:  { type: Types.ObjectId, ref: 'Branch',  default: null },
    reference:  { type: String, required: true },
    type:       { type: String, default: 'adjustment' },
    reason:     { type: String },
    status:     { type: String, default: 'completed' },
    notes:      { type: String },
    created_by: { type: Types.ObjectId, ref: 'User', default: null },
    items:      { type: [adjItemSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

stockAdjSchema.index({ company_id: 1 });
stockAdjSchema.index({ company_id: 1, reference: 1 }, { unique: true });
stockAdjSchema.index({ company_id: 1, created_at: -1 });
stockAdjSchema.plugin(basePlugin);

module.exports = model('StockAdjustment', stockAdjSchema);
