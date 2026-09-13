'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

// Embedded variant sub-document
const variantSchema = new Schema(
  {
    company_id:     { type: Types.ObjectId, ref: 'Company', required: true },
    sku:            { type: String, required: true },
    barcode:        { type: String },
    size:           { type: String },
    color:          { type: String },
    cost_price:     { type: Number, default: 0 },
    sale_price:     { type: Number, default: 0 },
    stock_quantity: { type: Number, default: 0 },
    is_active:      { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: true }
);

variantSchema.plugin(basePlugin);

const productSchema = new Schema(
  {
    company_id:       { type: Types.ObjectId, ref: 'Company',  required: true },
    category_id:      { type: Types.ObjectId, ref: 'Category', default: null },
    brand_id:         { type: Types.ObjectId, ref: 'Brand',    default: null },
    name:             { type: String, required: true },
    sku:              { type: String, required: true },
    barcode:          { type: String },
    description:      { type: String },
    image:            { type: String },
    unit:             { type: String, default: 'pcs' },
    cost_price:       { type: Number, default: 0 },
    sale_price:       { type: Number, default: 0 },
    wholesale_price:  { type: Number, default: 0 },
    tax_rate:         { type: Number, default: 0 },
    stock_quantity:   { type: Number, default: 0 },
    low_stock_alert:  { type: Number, default: 5 },
    track_inventory:  { type: Boolean, default: true },
    allow_negative:   { type: Boolean, default: false },
    is_active:        { type: Boolean, default: true },
    is_raw_material:  { type: Boolean, default: false },
    is_finished_good: { type: Boolean, default: false },
    variants:         { type: [variantSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

productSchema.index({ company_id: 1 });
productSchema.index({ company_id: 1, sku: 1 }, { unique: true });
productSchema.index({ company_id: 1, barcode: 1 }, { sparse: true });
productSchema.index({ company_id: 1, category_id: 1 });
productSchema.index({ company_id: 1, brand_id: 1 });
productSchema.plugin(basePlugin);

module.exports = model('Product', productSchema);
