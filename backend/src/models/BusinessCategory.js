'use strict';

const { Schema, model } = require('mongoose');
const basePlugin = require('./_plugin');

const businessCategorySchema = new Schema(
  {
    key:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active:   { type: Boolean, default: true },
    features:    { type: Schema.Types.Mixed, default: {} },
    sort_order:  { type: Number, default: 0 },
    grandfathered: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

businessCategorySchema.index({ is_active: 1, sort_order: 1 });
businessCategorySchema.plugin(basePlugin);

module.exports = model('BusinessCategory', businessCategorySchema);
