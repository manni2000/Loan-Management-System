import 'dotenv/config';
import path from 'node:path';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lumen',
  mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || '').split(',').map(server => server.trim()).filter(Boolean),
  secret: process.env.JWT_SECRET || '',
  // Browser Origin headers contain only the scheme and host, with no trailing slash.
  frontend: new URL(process.env.FRONTEND_URL || 'http://localhost:3000').origin,
  production: process.env.NODE_ENV === 'production',
  uploads: path.resolve('uploads'),
};
export function validateConfig() {
  if (config.secret.length < 32) throw new Error('Set JWT_SECRET to at least 32 characters in backend/.env.');
}
