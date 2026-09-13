'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const supplierSchema = new Schema(
  {
    company_id:      { type: Types.ObjectId, ref: 'Company', required: true },
    name:            { type: String, required: true },
    email:           { type: String },
    phone:           { type: String },
    address:         { type: String },
    city:            { type: String },
    opening_balance: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 },
    is_active:       { type: Boolean, default: true },
    notes:           { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

supplierSchema.index({ company_id: 1 });
supplierSchema.index({ company_id: 1, name: 1 }, { unique: true });
supplierSchema.plugin(basePlugin);

module.exports = model('Supplier', supplierSchema);
