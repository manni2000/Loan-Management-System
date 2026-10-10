import { setServers } from 'node:dns/promises';
import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDatabase() {
  // The MongoDB driver uses the promise DNS resolver for SRV/TXT discovery.
  // Configure it before connecting; an empty setting preserves system defaults.
  if (config.mongoDnsServers.length > 0) {
    try {
      setServers(config.mongoDnsServers);
    } catch {
      throw new Error('Invalid MONGODB_DNS_SERVERS. Use comma-separated DNS IP addresses, e.g. 1.1.1.1,8.8.8.8.');
    }
  }
  await mongoose.connect(config.mongoUri);
}
