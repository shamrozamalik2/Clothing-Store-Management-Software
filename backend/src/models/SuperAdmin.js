'use strict';

const { Schema, model } = require('mongoose');
const basePlugin = require('./_plugin');

const superAdminSchema = new Schema(
  {
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    is_active:  { type: Boolean, default: true },
    last_login: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

superAdminSchema.index({ email: 1 }, { unique: true });
superAdminSchema.plugin(basePlugin);

module.exports = model('SuperAdmin', superAdminSchema);
