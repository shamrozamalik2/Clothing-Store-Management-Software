'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const expenseSchema = new Schema(
  {
    company_id:     { type: Types.ObjectId, ref: 'Company',         required: true },
    branch_id:      { type: Types.ObjectId, ref: 'Branch',          default: null },
    category_id:    { type: Types.ObjectId, ref: 'ExpenseCategory', default: null },
    reference:      { type: String },
    title:          { type: String, required: true },
    amount:         { type: Number, required: true },
    payment_method: { type: String, default: 'cash' },
    expense_date:   { type: Date, default: Date.now },
    notes:          { type: String },
    is_recurring:   { type: Boolean, default: false },
    recurring_day:  { type: Number, default: null },
    parent_id:      { type: Types.ObjectId, ref: 'Expense', default: null },
    created_by:     { type: Types.ObjectId, ref: 'User',    default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

expenseSchema.index({ company_id: 1 });
expenseSchema.index({ company_id: 1, expense_date: -1 });
expenseSchema.plugin(basePlugin);

module.exports = model('Expense', expenseSchema);
