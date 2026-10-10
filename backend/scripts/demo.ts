import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

// Local evaluator convenience: runs a real MongoDB process with persistent data.
// Production uses MONGODB_URI and npm start instead.
const dbPath = path.resolve('.local-data');
await mkdir(dbPath, { recursive: true });
const mongo = await MongoMemoryServer.create({ instance: { port: 27018, dbPath, storageEngine: 'wiredTiger', dbName: 'lumen' } });
process.env.MONGODB_URI = mongo.getUri('lumen');
process.env.LUMEN_DEMO = '1';
console.log('Local demo MongoDB ready. Data persists in backend/.local-data.');
await import('../src/seed.js');
const { server } = await import('../src/server.js');
let stopping = false;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  server.close(() => { void (async () => { await mongoose.disconnect(); await mongo.stop(); process.exit(0); })(); });
});
