'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const refreshTokenSchema = new Schema(
  {
    user_id:    { type: Types.ObjectId, ref: 'User', required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

refreshTokenSchema.index({ user_id: 1 });
refreshTokenSchema.index({ token_hash: 1 }, { unique: true });
// TTL index — MongoDB auto-deletes tokens 30 days after expiry
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
refreshTokenSchema.plugin(basePlugin);

module.exports = model('RefreshToken', refreshTokenSchema);
