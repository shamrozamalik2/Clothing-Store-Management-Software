'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const roleSchema = new Schema(
  {
    company_id:  { type: Types.ObjectId, ref: 'Company', required: true },
    name:        { type: String, required: true },
    label:       { type: String },
    permissions: { type: Schema.Types.Mixed, default: {} },
    is_system:   { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

roleSchema.index({ company_id: 1 });
roleSchema.index({ company_id: 1, name: 1 }, { unique: true });
roleSchema.plugin(basePlugin);

module.exports = model('Role', roleSchema);
