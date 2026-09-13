'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const customerSchema = new Schema(
  {
    company_id:      { type: Types.ObjectId, ref: 'Company', required: true },
    name:            { type: String, required: true },
    email:           { type: String },
    phone:           { type: String },
    address:         { type: String },
    city:            { type: String },
    customer_group:  { type: String, default: 'general' },
    credit_limit:    { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 },
    loyalty_points:  { type: Number, default: 0 },
    is_active:       { type: Boolean, default: true },
    notes:           { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

customerSchema.index({ company_id: 1 });
customerSchema.plugin(basePlugin);

module.exports = model('Customer', customerSchema);
