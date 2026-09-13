'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const bomSchema = new Schema(
  {
    company_id:        { type: Types.ObjectId, ref: 'Company', required: true },
    product_id:        { type: Types.ObjectId, ref: 'Product', required: true },
    raw_material_id:   { type: Types.ObjectId, ref: 'Product', required: true },
    quantity_required: { type: Number, default: 1 },
    unit:              { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

bomSchema.index({ company_id: 1, product_id: 1 });
bomSchema.index({ company_id: 1, product_id: 1, raw_material_id: 1 }, { unique: true });
bomSchema.plugin(basePlugin);

module.exports = model('BillOfMaterials', bomSchema);
