'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const settingSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    key:        { type: String, required: true },
    value:      { type: String, default: null },
    type:       { type: String, default: 'string' },
    group_name: { type: String, default: 'general' },
    label:      { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

settingSchema.index({ company_id: 1 });
settingSchema.index({ company_id: 1, key: 1 }, { unique: true });
settingSchema.plugin(basePlugin);

module.exports = model('Setting', settingSchema);
