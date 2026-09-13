'use strict';

/**
 * Shared Mongoose plugin applied to every schema.
 * - Adds a string `id` virtual (ObjectId.toString()) to every document.
 * - Removes `_id` and `__v` from JSON output so existing API responses stay clean.
 */
function basePlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret._id ? ret._id.toString() : undefined;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });

  schema.set('toObject', { virtuals: true });
}

module.exports = basePlugin;
