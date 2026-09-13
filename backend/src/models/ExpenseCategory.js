'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const expenseCategorySchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    name:       { type: String, required: true },
    is_active:  { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

expenseCategorySchema.index({ company_id: 1 });
expenseCategorySchema.index({ company_id: 1, name: 1 }, { unique: true });
expenseCategorySchema.plugin(basePlugin);

module.exports = model('ExpenseCategory', expenseCategorySchema);
