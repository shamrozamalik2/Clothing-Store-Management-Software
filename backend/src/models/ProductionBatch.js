'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const batchMaterialSchema = new Schema(
  {
    product_id:    { type: Types.ObjectId, ref: 'Product', default: null },
    product_name:  { type: String, required: true },
    quantity_used: { type: Number, required: true },
    unit_cost:     { type: Number, default: 0 },
    total_cost:    { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, _id: true }
);
batchMaterialSchema.plugin(basePlugin);

const productionBatchSchema = new Schema(
  {
    company_id:        { type: Types.ObjectId, ref: 'Company', required: true },
    product_id:        { type: Types.ObjectId, ref: 'Product', required: true },
    reference:         { type: String, required: true },
    quantity_produced: { type: Number, required: true },
    production_cost:   { type: Number, default: 0 },
    batch_date:        { type: Date, default: Date.now },
    status:            { type: String, default: 'completed', enum: ['planned', 'in_progress', 'completed', 'cancelled'] },
    notes:             { type: String },
    created_by:        { type: Types.ObjectId, ref: 'User', default: null },
    materials:         { type: [batchMaterialSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

productionBatchSchema.index({ company_id: 1 });
productionBatchSchema.index({ company_id: 1, reference: 1 }, { unique: true });
productionBatchSchema.plugin(basePlugin);

module.exports = model('ProductionBatch', productionBatchSchema);
