'use strict';

const { Schema, model, Types } = require('mongoose');
const basePlugin = require('./_plugin');

const auditLogSchema = new Schema(
  {
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    user_id:    { type: Types.ObjectId, ref: 'User',    default: null },
    action:     { type: String, required: true },
    entity:     { type: String },
    entity_id:  { type: String },  // stored as string (ObjectId of the affected doc)
    old_values: { type: Schema.Types.Mixed },
    new_values: { type: Schema.Types.Mixed },
    ip_address: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// TTL: auto-expire audit logs after 2 years
auditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600 });
auditLogSchema.index({ company_id: 1, created_at: -1 });
auditLogSchema.plugin(basePlugin);

module.exports = model('AuditLog', auditLogSchema);
