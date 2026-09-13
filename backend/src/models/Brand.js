'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const brandSchema = new Schema(
  {
    company_id:  { type: Types.ObjectId, ref: 'Company', required: true },
    name:        { type: String, required: true },
    slug:        { type: String },
    description: { type: String },
    logo:        { type: String },
    is_active:   { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

brandSchema.index({ company_id: 1 });
brandSchema.index({ company_id: 1, name: 1 }, { unique: true });
brandSchema.plugin(basePlugin);

module.exports = model('Brand', brandSchema);
