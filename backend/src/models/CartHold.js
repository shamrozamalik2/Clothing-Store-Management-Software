'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const cartHoldSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    user_id:    { type: Types.ObjectId, ref: 'User',    default: null },
    label:      { type: String },
    cart_data:  { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

cartHoldSchema.index({ company_id: 1 });
cartHoldSchema.plugin(basePlugin);

module.exports = model('CartHold', cartHoldSchema);
