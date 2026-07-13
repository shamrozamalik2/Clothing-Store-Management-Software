#!/usr/bin/env node
'use strict';

/**
 * SAS Garments — License Key Generator
 * Developer-only tool. Do NOT ship this with the installer.
 *
 * Usage:
 *   node scripts/keygen.js --tier standard --expiry 2026-12-31
 *   node scripts/keygen.js --tier pro      --expiry 2026-06-30
 *   node scripts/keygen.js --tier lifetime
 *   node scripts/keygen.js --validate AAAAAA-BBBBBB-CCCCCC-DDDDDD
 *
 * Tiers: standard | pro | lifetime
 */

const { buildKey, validateKey } = require('../electron/license');

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
SAS Garments License Key Generator
------------------------------------
Generate:  node scripts/keygen.js --tier standard --expiry 2026-12-31
           node scripts/keygen.js --tier lifetime
Validate:  node scripts/keygen.js --validate AAAAAA-BBBBBB-CCCCCC-DDDDDD
  `);
}

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

function hasArg(flag) {
  return args.includes(flag);
}

if (args.length === 0 || hasArg('--help') || hasArg('-h')) {
  printHelp();
  process.exit(0);
}

// ─── Validate mode ────────────────────────────────────────────────────────────

const validateKey_ = getArg('--validate');
if (validateKey_) {
  const result = validateKey(validateKey_);
  console.log('\n── Key Validation ───────────────────────────────');
  console.log('Key:    ', validateKey_);
  if (!result.valid) {
    console.log('Status:  ❌ INVALID —', result.error);
  } else {
    console.log('Status:  ✓ VALID');
    console.log('Tier:   ', result.tier);
    console.log('Expiry: ', result.isLifetime ? 'Lifetime' : result.expiryDate);
    console.log('Days left:', result.isLifetime ? '∞' : result.daysLeft);
    if (result.expired) console.log('         ⚠️  EXPIRED');
  }
  console.log('─────────────────────────────────────────────────\n');
  process.exit(0);
}

// ─── Generate mode ────────────────────────────────────────────────────────────

const tier = getArg('--tier') || 'standard';
if (!['standard', 'pro', 'lifetime'].includes(tier)) {
  console.error('Error: --tier must be standard | pro | lifetime');
  process.exit(1);
}

let expiryDate;
if (tier === 'lifetime') {
  expiryDate = new Date(2099, 11, 31);
} else {
  const expiryStr = getArg('--expiry');
  if (!expiryStr) {
    console.error('Error: --expiry YYYY-MM-DD is required for non-lifetime tiers.');
    process.exit(1);
  }
  expiryDate = new Date(expiryStr + 'T00:00:00Z');
  if (isNaN(expiryDate.getTime())) {
    console.error('Error: Invalid --expiry date. Use YYYY-MM-DD format.');
    process.exit(1);
  }
  if (expiryDate < new Date()) {
    console.error('Warning: Expiry date is in the past.');
  }
}

const key     = buildKey(tier, expiryDate);
const verify  = validateKey(key);

console.log('\n── Generated License Key ────────────────────────');
console.log('Key:    ', key);
console.log('Tier:   ', tier);
console.log('Expiry: ', tier === 'lifetime' ? 'Lifetime' : expiryDate.toISOString().slice(0, 10));
console.log('Valid:  ', verify.valid ? '✓ YES' : '✗ NO (check error)');
console.log('─────────────────────────────────────────────────\n');
