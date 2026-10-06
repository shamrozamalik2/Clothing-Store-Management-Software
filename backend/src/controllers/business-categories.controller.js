'use strict';

const Company          = require('../models/Company');
const BusinessCategory = require('../models/BusinessCategory');
const logger           = require('../config/logger');
const { FEATURES } = require('../config/features');
const { success, created, error } = require('../utils/response');
const svc = require('../services/businessCategory.service');
const featureCache = require('../services/features.service');

const listBusinessCategories = async (req, res, next) => {
  try {
    const categories = await BusinessCategory.find({}).sort({ sort_order: 1, key: 1 }).lean();
    return success(res, {
      categories: categories.map(c => ({ ...c, id: c._id.toString() })),
      registry: FEATURES,
    });
  } catch (err) { next(err); }
};

const createBusinessCategory = async (req, res, next) => {
  try {
    const { key, name, description = '', features, sort_order = 0 } = req.body;
    if (!name || !String(name).trim()) return error(res, 'Category name is required.', 422);

    let normalizedKey, sanitized;
    try {
      normalizedKey = svc.normalizeCategoryKey(key);
      sanitized     = svc.sanitizeFeatures(features);
    } catch (e) { return error(res, e.message, 422); }

    if (await BusinessCategory.exists({ key: normalizedKey })) return error(res, `Category "${normalizedKey}" already exists.`, 409);

    const category = await BusinessCategory.create({
      key: normalizedKey,
      name: String(name).trim(),
      description: String(description || '').trim(),
      sort_order: Number(sort_order) || 0,
      is_active: true,
      features: svc.completeFeatureMap(sanitized),
    });
    logger.info(`[SuperAdmin] Business category created: ${normalizedKey}`);
    return created(res, { ...category.toJSON(), id: category._id.toString() }, 'Business category created.');
  } catch (err) { next(err); }
};

const updateBusinessCategory = async (req, res, next) => {
  try {
    let key;
    try { key = svc.normalizeCategoryKey(req.params.key); } catch (e) { return error(res, e.message, 422); }

    const existing = await BusinessCategory.findOne({ key }).lean();
    if (!existing) return error(res, 'Business category not found.', 404);

    const { name, description, features, sort_order } = req.body;
    const update = { updated_at: new Date() };
    if (name !== undefined) {
      if (!String(name).trim()) return error(res, 'Category name cannot be empty.', 422);
      update.name = String(name).trim();
    }
    if (description !== undefined) update.description = String(description || '').trim();
    if (sort_order !== undefined)  update.sort_order  = Number(sort_order) || 0;
    if (features !== undefined) {
      try {
        // Merge onto the existing map so omitting a feature never switches it off.
        update.features = svc.completeFeatureMap({ ...existing.features, ...svc.sanitizeFeatures(features) });
      } catch (e) { return error(res, e.message, 422); }
    }

    const updated = await BusinessCategory.findOneAndUpdate({ key }, update, { new: true }).lean();
    featureCache.invalidateAll();
    logger.info(`[SuperAdmin] Business category updated: ${key}`);
    return success(res, { ...updated, id: updated._id.toString() }, 'Business category updated.');
  } catch (err) { next(err); }
};

const setBusinessCategoryStatus = async (req, res, next) => {
  try {
    let key;
    try { key = svc.normalizeCategoryKey(req.params.key); } catch (e) { return error(res, e.message, 422); }
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return error(res, 'is_active must be true or false.', 422);

    const updated = await BusinessCategory.findOneAndUpdate({ key }, { is_active, updated_at: new Date() }, { new: true }).lean();
    featureCache.invalidateAll();
    if (!updated) return error(res, 'Business category not found.', 404);
    logger.info(`[SuperAdmin] Business category ${key} ${is_active ? 'activated' : 'deactivated'}`);
    return success(res, { ...updated, id: updated._id.toString() }, `Business category ${is_active ? 'activated' : 'deactivated'}.`);
  } catch (err) { next(err); }
};

const assignCompanyBusinessCategory = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return error(res, 'Company not found.', 404);

    let category;
    try { category = await svc.assertAssignable(req.body.business_category); } catch (e) { return error(res, e.message, 422); }

    const previous = company.business_category;
    await Company.updateOne({ _id: company._id }, { business_category: category.key, updated_at: new Date() });
    featureCache.invalidateCompany(company._id);
    logger.info(`[SuperAdmin] Company ${company.slug} business category ${previous} -> ${category.key}`);
    return success(res, { id: company._id.toString(), business_category: category.key, previous_business_category: previous }, 'Company business category updated.');
  } catch (err) { next(err); }
};

module.exports = {
  listBusinessCategories,
  createBusinessCategory,
  updateBusinessCategory,
  setBusinessCategoryStatus,
  assignCompanyBusinessCategory,
};
