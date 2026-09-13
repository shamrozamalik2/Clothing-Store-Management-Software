'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const userSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    branch_id:  { type: Types.ObjectId, ref: 'Branch',  default: null },
    role_id:    { type: Types.ObjectId, ref: 'Role',    required: true },
    name:       { type: String, required: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    avatar:     { type: String },
    phone:      { type: String },
    is_active:  { type: Boolean, default: true },
    last_login: { type: Date },
    fcm_token:  { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.index({ company_id: 1 });
userSchema.index({ company_id: 1, email: 1 }, { unique: true });
userSchema.plugin(basePlugin);

module.exports = model('User', userSchema);
