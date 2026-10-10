import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { User } from '../models/User.js';
export const sales = Router();
sales.use(authenticate, authorize('Admin', 'Sales'));
sales.get('/leads', async (_req, res) => {
  const leads = await User.aggregate([
    { $match: { role: 'Borrower' } },
    { $lookup: { from: 'loans', localField: '_id', foreignField: 'borrower', as: 'loans' } },
    { $match: { 'loans.0': { $exists: false } } },
    { $project: { name: 1, email: 1, createdAt: 1, personal: 1, hasSalarySlip: { $cond: [{ $ifNull: ['$salarySlip.filename', false] }, true, false] } } },
    { $sort: { createdAt: -1 } },
  ]);
  res.json({ leads });
});
