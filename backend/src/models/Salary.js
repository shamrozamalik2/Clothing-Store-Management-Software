'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const salarySchema = new Schema(
  {
    company_id:     { type: Types.ObjectId, ref: 'Company',  required: true },
    employee_id:    { type: Types.ObjectId, ref: 'Employee', required: true },
    month:          { type: Number, required: true, min: 1, max: 12 },
    year:           { type: Number, required: true },
    base_salary:    { type: Number, default: 0 },
    allowances:     { type: Number, default: 0 },
    deductions:     { type: Number, default: 0 },
    gross_salary:   { type: Number, default: 0 },
    net_salary:     { type: Number, default: 0 },
    status:         { type: String, default: 'pending', enum: ['pending', 'paid'] },
    paid_at:        { type: Date },
    payment_method: { type: String, default: 'cash' },
    notes:          { type: String },
    created_by:     { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

salarySchema.index({ company_id: 1 });
salarySchema.index({ employee_id: 1 });
salarySchema.index({ company_id: 1, employee_id: 1, month: 1, year: 1 }, { unique: true });
salarySchema.plugin(basePlugin);

module.exports = model('Salary', salarySchema);
