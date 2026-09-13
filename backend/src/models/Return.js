'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const returnItemSchema = new Schema(
  {
    product_id:   { type: Types.ObjectId, ref: 'Product', default: null },
    variant_id:   { type: Types.ObjectId, default: null },
    sale_item_id: { type: Types.ObjectId, default: null },
    product_name: { type: String, required: true },
    sku:          { type: String },
    quantity:     { type: Number, required: true },
    unit_price:   { type: Number, required: true },
    total:        { type: Number, required: true },
  },
  { _id: true }
);
returnItemSchema.plugin(basePlugin);

const exchangeItemSchema = new Schema(
  {
    product_id:   { type: Types.ObjectId, ref: 'Product', default: null },
    variant_id:   { type: Types.ObjectId, default: null },
    product_name: { type: String, required: true },
    sku:          { type: String },
    quantity:     { type: Number, required: true },
    unit_price:   { type: Number, required: true },
    total:        { type: Number, required: true },
  },
  { _id: true }
);
exchangeItemSchema.plugin(basePlugin);

const returnSchema = new Schema(
  {
    company_id:     { type: Types.ObjectId, ref: 'Company', required: true },
    sale_id:        { type: Types.ObjectId, ref: 'Sale',    default: null },
    reference:      { type: String, required: true },
    type:           { type: String, default: 'return', enum: ['return', 'exchange'] },
    return_date:    { type: Date, default: Date.now },
    reason:         { type: String },
    total_amount:   { type: Number, default: 0 },
    refund_amount:  { type: Number, default: 0 },
    exchange_total: { type: Number, default: 0 },
    refund_method:  { type: String },
    notes:          { type: String },
    created_by:     { type: Types.ObjectId, ref: 'User', default: null },
    items:          { type: [returnItemSchema],   default: [] },
    exchange_items: { type: [exchangeItemSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

returnSchema.index({ company_id: 1 });
returnSchema.index({ company_id: 1, reference: 1 }, { unique: true });
returnSchema.index({ company_id: 1, return_date: -1 });
returnSchema.plugin(basePlugin);

module.exports = model('Return', returnSchema);
