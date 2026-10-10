import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Loan, serializeLoan } from '../models/Loan.js';
import { User } from '../models/User.js';
export const operations = Router();
operations.use(authenticate, authorize('Admin', 'Sales', 'Sanction', 'Disbursement', 'Collection'));
operations.get('/overview', async (req, res) => {
  const role = req.user.role;
  const stages: Record<string, string[]> = { Admin: ['APPLIED','SANCTIONED','REJECTED','DISBURSED','CLOSED'], Sanction: ['APPLIED','REJECTED'], Disbursement: ['SANCTIONED'], Collection: ['DISBURSED','CLOSED'], Sales: [] };
  const loans = await Loan.find({ status: { $in: stages[role] } }).populate('borrower', 'name email').sort({ createdAt: -1 });
  const registered = role === 'Admin' || role === 'Sales' ? await User.countDocuments({ role: 'Borrower' }) : undefined;
  res.json({ loans: loans.map(serializeLoan), registered });
});
