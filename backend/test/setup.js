'use strict';

// Minimal test harness: a real, isolated MongoDB replica set in memory (needed
// because the code under test relies on multi-document transactions, which
// require a replica set even for a single node) plus Node's built-in test
// runner. No Jest/Mocha — node:test and node:assert are already in Node 22.

// config/env.js requires these at import time (fails fast in real deployments
// if missing) — dummy values only, never read for anything real in tests.
// Must be set before any src/ module is required anywhere in the test suite.
process.env.JWT_SECRET     ||= 'test-jwt-secret';
process.env.REFRESH_SECRET ||= 'test-refresh-secret';
process.env.SUPER_ADMIN_JWT_SECRET ||= 'test-super-admin-secret';

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'test' });
}

async function stopDb() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

module.exports = { startDb, stopDb, clearDb };
