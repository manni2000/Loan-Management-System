import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { validateConfig } from './config.js';
import { User, roles } from './models/User.js';
import { Loan } from './models/Loan.js';
import { connectDatabase } from './database.js';

validateConfig();
await connectDatabase();
await Promise.all([User.init(), Loan.init()]);
const password = await bcrypt.hash('Lumen@123', 12);
for (const role of roles) {
  const email = `${role.toLowerCase()}@lumen.test`;
  if (!await User.exists({ email })) await User.create({ name: role === 'Borrower' ? 'Borrower Account' : `${role} Executive`, email, password, role });
}
console.log('Seed complete. Role accounts: admin/sales/sanction/disbursement/collection/borrower@lumen.test. Password: Lumen@123');
await mongoose.disconnect();
