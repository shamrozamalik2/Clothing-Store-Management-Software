'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

// One row per lot of a batch-tracked product. Lots with the same batch number and
// expiry date share a row. For batch-tracked products the rows always add up to
// Product.stock_quantity. Lots are only ever changed through stockBatch.service.js.
const stockBatchSchema = new Schema(
  {
    company_id:  { type: Types.ObjectId, ref: 'Company', required: true },
    product_id:  { type: Types.ObjectId, ref: 'Product', required: true },
    batch_no:    { type: String, default: null },
    expiry_date: { type: Date, default: null },
    mfg_date:    { type: Date, default: null },
    quantity:    { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

stockBatchSchema.index(
  { company_id: 1, product_id: 1, batch_no: 1, expiry_date: 1 },
  { unique: true, name: 'uniq_product_lot' }
);
stockBatchSchema.index({ company_id: 1, product_id: 1, quantity: 1 });
stockBatchSchema.index({ company_id: 1, expiry_date: 1 });
stockBatchSchema.plugin(basePlugin);

module.exports = model('StockBatch', stockBatchSchema);
