import mongoose from 'mongoose';
import { config, validateConfig } from './config.js';
import { app } from './app.js';
import { User } from './models/User.js';
import { Loan } from './models/Loan.js';
import { connectDatabase } from './database.js';
validateConfig();
await connectDatabase();
await Promise.all([User.init(), Loan.init()]);
export const server = app.listen(config.port, () => console.log(`Lumen API listening on http://localhost:${config.port}`));
if (process.env.LUMEN_DEMO !== '1') {
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); }); });
}
