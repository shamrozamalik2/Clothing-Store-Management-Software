'use strict';

const Setting = require('../models/Setting');

const DEFAULTS = [
  { key: 'company_name',         value: 'Online Store',                     type: 'string',  group_name: 'company', label: 'Company Name' },
  { key: 'company_tagline',      value: '',                                 type: 'string',  group_name: 'company', label: 'Tagline' },
  { key: 'company_address',      value: '',                                 type: 'string',  group_name: 'company', label: 'Address' },
  { key: 'company_city',         value: '',                                 type: 'string',  group_name: 'company', label: 'City' },
  { key: 'company_phone',        value: '',                                 type: 'string',  group_name: 'company', label: 'Phone' },
  { key: 'company_email',        value: '',                                 type: 'string',  group_name: 'company', label: 'Email' },
  { key: 'company_website',      value: '',                                 type: 'string',  group_name: 'company', label: 'Website' },
  { key: 'company_logo',         value: '',                                 type: 'string',  group_name: 'company', label: 'Company Logo (base64)' },
  { key: 'currency_symbol',      value: '₨',                               type: 'string',  group_name: 'billing', label: 'Currency Symbol' },
  { key: 'default_tax_rate',     value: '0',                               type: 'number',  group_name: 'billing', label: 'Default Tax Rate (%)' },
  { key: 'allow_negative_stock', value: 'false',                           type: 'boolean', group_name: 'billing', label: 'Allow Negative Stock' },
  { key: 'receipt_header',       value: 'Thank you for shopping with us!', type: 'string',  group_name: 'receipt', label: 'Receipt Header' },
  { key: 'receipt_footer',       value: 'Exchange within 7 days with receipt.', type: 'string', group_name: 'receipt', label: 'Receipt Footer' },
  { key: 'show_tax_on_receipt',  value: 'true',                            type: 'boolean', group_name: 'receipt', label: 'Show Tax on Receipt' },
];

async function ensureDefaults(companyId) {
  const ops = DEFAULTS.map(d => ({
    updateOne: {
      filter: { company_id: companyId, key: d.key },
      update: { $setOnInsert: { company_id: companyId, key: d.key, value: d.value, type: d.type, group_name: d.group_name, label: d.label } },
      upsert: true,
    },
  }));
  if (ops.length) await Setting.bulkWrite(ops, { ordered: false });
}

function parseValue(row) {
  if (!row) return null;
  const { type, value } = row;
  if (type === 'number')  return { ...row, value: parseFloat(value) || 0 };
  if (type === 'boolean') return { ...row, value: value === 'true' || value === '1' };
  return row;
}

exports.getAll = async (req, res, next) => {
  try {
    const cid = req.companyId;
    await ensureDefaults(cid);
    const settings = await Setting.find({ company_id: cid }).sort({ group_name: 1, key: 1 }).lean();
    const grouped  = {};
    for (const row of settings) {
      const parsed = parseValue(row);
      if (!grouped[row.group_name]) grouped[row.group_name] = {};
      grouped[row.group_name][row.key] = parsed;
    }
    res.json({ success: true, data: grouped });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const cid = req.companyId;
    await ensureDefaults(cid);
    const row = await Setting.findOne({ company_id: cid, key: req.params.key }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Setting not found.' });
    res.json({ success: true, data: parseValue(row) });
  } catch (err) { next(err); }
};

exports.updateBulk = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const updates = req.body;
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Body must be a flat key→value object.' });
    }

    const ops = Object.entries(updates).map(([key, val]) => ({
      updateOne: {
        filter: { company_id: cid, key },
        update: { $set: { value: String(val ?? ''), updated_at: new Date() }, $setOnInsert: { company_id: cid, key, type: 'string', group_name: 'company' } },
        upsert: true,
      },
    }));
    if (ops.length) await Setting.bulkWrite(ops, { ordered: false });
    res.json({ success: true, message: 'Settings saved.' });
  } catch (err) { next(err); }
};

exports.updateOne = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ success: false, message: 'value is required.' });

    const row = await Setting.findOne({ company_id: cid, key: req.params.key }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Setting not found.' });

    await Setting.updateOne({ company_id: cid, key: req.params.key }, { value: String(value), updated_at: new Date() });
    res.json({ success: true, message: 'Setting updated.' });
  } catch (err) { next(err); }
};
