'use strict';

const mongoose = require('mongoose');
const { env }  = require('./env');

let isConnected = false;

async function connectMongo() {
  if (isConnected) return;

  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('[MongoDB] MONGODB_URI is not set in environment.');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize:       10,
    minPoolSize:       2,
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS:          45_000,
    connectTimeoutMS:         15_000,
  });

  isConnected = true;
  console.log('[MongoDB] Connected:', mongoose.connection.name);

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Mongoose will auto-reconnect.');
    isConnected = false;
  });
}

async function closeMongo() {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  console.log('[MongoDB] Connection closed.');
}

// Graceful shutdown
process.on('SIGINT',  () => closeMongo().then(() => process.exit(0)));
process.on('SIGTERM', () => closeMongo().then(() => process.exit(0)));

// Expose mongoose for transaction sessions
module.exports = { connectMongo, closeMongo, mongoose };
