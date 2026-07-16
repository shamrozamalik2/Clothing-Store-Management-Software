'use strict';

const { query } = require('../config/database');

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = [
  { key: 'company_name',         value: 'Online Store',                     type: 'string',  group_name: 'company', label: 'Company Name' },
  { key: 'company_tagline',      value: '',                                 type: 'string',  group_name: 'company', label: 'Tagline' },
  { key: 'company_address',      value: '',                                 type: 'string',  group_name: 'company', label: 'Address' },
  { key: 'company_city',         value: '',                                 type: 'string',  group_name: 'company', label: 'City' },
  { key: 'company_phone',        value: '',                                 type: 'string',  group_name: 'company', label: 'Phone' },
  { key: 'company_email',        value: '',                                 type: 'string',  group_name: 'company', label: 'Email' },
  { key: 'company_website',      value: '',                                 type: 'string',  group_name: 'company', label: 'Website' },
  { key: 'currency_symbol',      value: '₨',                               type: 'string',  group_name: 'billing', label: 'Currency Symbol' },
  { key: 'default_tax_rate',     value: '0',                               type: 'number',  group_name: 'billing', label: 'Default Tax Rate (%)' },
  { key: 'allow_negative_stock', value: 'false',                           type: 'boolean', group_name: 'billing', label: 'Allow Negative Stock' },
  { key: 'receipt_header',       value: 'Thank you for shopping with us!', type: 'string',  group_name: 'receipt', label: 'Receipt Header' },
  { key: 'receipt_footer',       value: 'Exchange within 7 days with receipt.', type: 'string', group_name: 'receipt', label: 'Receipt Footer' },
  { key: 'show_tax_on_receipt',  value: 'true',                            type: 'boolean', group_name: 'receipt', label: 'Show Tax on Receipt' },
];

async function ensureDefaults(companyId) {
  for (const row of DEFAULTS) {
    await query(`
      INSERT INTO settings (company_id, key, value, type, group_name, label)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (company_id, key) DO NOTHING
    `, [companyId, row.key, row.value, row.type, row.group_name, row.label]);
  }
}

function parseValue(row) {
  if (!row) return null;
  const { type, value } = row;
  if (type === 'number')  return { ...row, value: parseFloat(value) || 0 };
  if (type === 'boolean') return { ...row, value: value === 'true' || value === '1' };
  return row;
}

// ─── GET /settings ────────────────────────────────────────────────────────────

exports.getAll = async (req, res, next) => {
  try {
    const cid = req.companyId;
    await ensureDefaults(cid);

    const { rows } = await query(
      'SELECT * FROM settings WHERE company_id=$1 ORDER BY group_name, key',
      [cid]
    );
    const grouped = {};
    for (const row of rows) {
      const parsed = parseValue(row);
      if (!grouped[row.group_name]) grouped[row.group_name] = {};
      grouped[row.group_name][row.key] = parsed;
    }
    res.json({ success: true, data: grouped });
  } catch (err) { next(err); }
};

// ─── GET /settings/:key ───────────────────────────────────────────────────────

exports.getOne = async (req, res, next) => {
  try {
    const cid = req.companyId;
    await ensureDefaults(cid);

    const { rows: [row] } = await query(
      'SELECT * FROM settings WHERE company_id=$1 AND key=$2',
      [cid, req.params.key]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Setting not found.' });
    res.json({ success: true, data: parseValue(row) });
  } catch (err) { next(err); }
};

// ─── PUT /settings (bulk) ─────────────────────────────────────────────────────

exports.updateBulk = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const updates = req.body;

    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Body must be a flat key→value object.' });
    }

    for (const [key, val] of Object.entries(updates)) {
      await query(
        'UPDATE settings SET value=$1, updated_at=NOW() WHERE company_id=$2 AND key=$3',
        [String(val ?? ''), cid, key]
      );
    }
    res.json({ success: true, message: 'Settings saved.' });
  } catch (err) { next(err); }
};

// ─── PUT /settings/:key ───────────────────────────────────────────────────────

exports.updateOne = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'value is required.' });
    }

    const { rows: [row] } = await query(
      'SELECT id FROM settings WHERE company_id=$1 AND key=$2',
      [cid, req.params.key]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Setting not found.' });

    await query(
      'UPDATE settings SET value=$1, updated_at=NOW() WHERE company_id=$2 AND key=$3',
      [String(value), cid, req.params.key]
    );
    res.json({ success: true, message: 'Setting updated.' });
  } catch (err) { next(err); }
};
