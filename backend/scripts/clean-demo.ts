import mongoose from 'mongoose';
import { validateConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { User } from '../src/models/User.js';
import { Loan } from '../src/models/Loan.js';

// Identify only fixtures created by the original seed, never all borrowers/loans.
const names = ['Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ishita Patel', 'Kabir Singh', 'Ananya Rao', 'Vikram Desai', 'Neha Kapoor', 'Arjun Reddy', 'Meera Joshi', 'Dev Malhotra'];
try {
  validateConfig();
  await connectDatabase();
  let deletedLoans = 0;
  let deletedUsers = 0;
  let preservedUsers = 0;
  for (const name of names) {
    const user = await User.findOne({ name, email: name.toLowerCase().replace(' ', '.') + '@lumen.test', role: 'Borrower', 'personal.pan': 'ABCPD1234E' });
    // One original lead was created without personal details.
    const candidate = user || (name === 'Dev Malhotra' ? await User.findOne({ name, email: 'dev.malhotra@lumen.test', role: 'Borrower', personal: { $exists: false } }) : null);
    if (!candidate) continue;
    if (candidate.salarySlip?.filename && candidate.salarySlip.filename !== 'sample-salary-slip.pdf') { preservedUsers++; continue; }
    const index = names.indexOf(name);
    const result = await Loan.deleteMany({ borrower: candidate._id, reference: 'LM-' + (1024 + index), $or: [
      { 'history.note': 'Seeded evaluation record' },
      { 'history.0.note': 'Application submitted', $expr: { $eq: ['$createdAt', { $arrayElemAt: ['$history.at', 0] }] } },
    ] });
    deletedLoans += result.deletedCount;
    if (await Loan.exists({ borrower: candidate._id })) { preservedUsers++; continue; }
    if (candidate.salarySlip?.filename && candidate.salarySlip.filename !== 'sample-salary-slip.pdf') { preservedUsers++; continue; }
    deletedUsers += (await User.deleteOne({ _id: candidate._id })).deletedCount;
  }
  console.log(JSON.stringify({ deletedLoans, deletedUsers, preservedUsers }));
} catch {
  console.error('Demo cleanup failed. Check database connectivity and configuration.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
