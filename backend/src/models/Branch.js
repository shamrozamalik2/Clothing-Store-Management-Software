'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const branchSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    name:       { type: String, required: true },
    address:    { type: String },
    phone:      { type: String },
    is_active:  { type: Boolean, default: true },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

branchSchema.index({ company_id: 1 });
branchSchema.plugin(basePlugin);

module.exports = model('Branch', branchSchema);
