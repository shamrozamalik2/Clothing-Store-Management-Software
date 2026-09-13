'use strict';

const { Schema, model } = require('mongoose');
const basePlugin = require('./_plugin');

const companySchema = new Schema(
  {
    name:                { type: String, required: true },
    slug:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:               { type: String },
    phone:               { type: String },
    address:             { type: String },
    logo_url:            { type: String },
    plan:                { type: String, default: 'standard' },
    is_active:           { type: Boolean, default: true },
    trial_ends_at:       { type: Date },
    subscription_status: { type: String, default: 'trial', enum: ['trial', 'active', 'expired', 'suspended'] },
    max_users:           { type: Number, default: 5 },
    license_key:         { type: String },
    billing_email:       { type: String },
    notes:               { type: String },
    suspended_at:        { type: Date },
    suspended_reason:    { type: String },
    features:            { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

companySchema.index({ slug: 1 }, { unique: true });
companySchema.index({ subscription_status: 1 });

companySchema.plugin(basePlugin);

module.exports = model('Company', companySchema);
