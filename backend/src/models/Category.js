'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const categorySchema = new Schema(
  {
    company_id:  { type: Types.ObjectId, ref: 'Company',  required: true },
    parent_id:   { type: Types.ObjectId, ref: 'Category', default: null },
    name:        { type: String, required: true },
    slug:        { type: String },
    description: { type: String },
    image:       { type: String },
    is_active:   { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

categorySchema.index({ company_id: 1 });
categorySchema.index({ company_id: 1, name: 1 }, { unique: true });
categorySchema.plugin(basePlugin);

module.exports = model('Category', categorySchema);
