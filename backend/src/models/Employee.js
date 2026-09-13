'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const employeeSchema = new Schema(
  {
    company_id:   { type: Types.ObjectId, ref: 'Company', required: true },
    name:         { type: String, required: true },
    email:        { type: String },
    phone:        { type: String },
    address:      { type: String },
    designation:  { type: String },
    department:   { type: String },
    base_salary:  { type: Number, default: 0 },
    allowances:   { type: Number, default: 0 },
    deductions:   { type: Number, default: 0 },
    hire_date:    { type: Date },
    is_active:    { type: Boolean, default: true },
    notes:        { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

employeeSchema.index({ company_id: 1 });
employeeSchema.plugin(basePlugin);

module.exports = model('Employee', employeeSchema);
