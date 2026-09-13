'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const demoLeadSchema = new Schema(
  {
    name:          { type: String, required: true },
    business:      { type: String, required: true },
    email:         { type: String, required: true },
    phone:         { type: String },
    business_type: { type: String },
    locations:     { type: String },
    message:       { type: String },
    source:        { type: String, default: 'website' },
    ip:            { type: String },
    user_agent:    { type: String },
    status:        { type: String, default: 'new', enum: ['new', 'contacted', 'qualified', 'converted', 'rejected'] },
    notes:         { type: String },
    handled_by:    { type: Types.ObjectId, ref: 'SuperAdmin', default: null },
    handled_at:    { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

demoLeadSchema.index({ created_at: -1 });
demoLeadSchema.index({ status: 1 });
demoLeadSchema.index({ email: 1 });
demoLeadSchema.plugin(basePlugin);

module.exports = model('DemoLead', demoLeadSchema);
