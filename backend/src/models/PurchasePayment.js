'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const purchasePaymentSchema = new Schema(
  {
    company_id:     { type: Types.ObjectId, ref: 'Company',  required: true },
    purchase_id:    { type: Types.ObjectId, ref: 'Purchase', required: true },
    amount:         { type: Number, required: true },
    payment_method: { type: String, default: 'cash' },
    reference:      { type: String },
    notes:          { type: String },
    paid_at:        { type: Date, default: Date.now },
    created_by:     { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

purchasePaymentSchema.index({ company_id: 1 });
purchasePaymentSchema.index({ purchase_id: 1 });
purchasePaymentSchema.plugin(basePlugin);

module.exports = model('PurchasePayment', purchasePaymentSchema);
