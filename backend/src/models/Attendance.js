'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const attendanceSchema = new Schema(
  {
    company_id:  { type: Types.ObjectId, ref: 'Company',  required: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    date:        { type: Date, required: true },
    check_in:    { type: Date },
    check_out:   { type: Date },
    status:      { type: String, default: 'present', enum: ['present', 'absent', 'late', 'half_day'] },
    notes:       { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

attendanceSchema.index({ company_id: 1 });
attendanceSchema.index({ employee_id: 1 });
attendanceSchema.index({ company_id: 1, employee_id: 1, date: 1 }, { unique: true });
attendanceSchema.plugin(basePlugin);

module.exports = model('Attendance', attendanceSchema);
