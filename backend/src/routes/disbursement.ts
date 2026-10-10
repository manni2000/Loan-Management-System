import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Loan, serializeLoan } from '../models/Loan.js';
import { listLoans, validId } from './shared.js';
export const disbursement = Router();
disbursement.use(authenticate, authorize('Admin', 'Disbursement'));
disbursement.get('/loans', async (_req, res) => { await listLoans('SANCTIONED', res); });
disbursement.patch('/loans/:id/disburse', validId, async (req, res) => {
  const existing = await Loan.findOne({ _id: req.params.id, status: 'SANCTIONED' });
  if (!existing) { res.status(409).json({ message: 'Only sanctioned loans can be disbursed.' }); return; }
  const now = new Date();
  const dueAt = new Date(now.getTime() + existing.tenure * 86400000);
  const loan = await Loan.findOneAndUpdate({ _id: existing._id, status: 'SANCTIONED' }, {
    $set: { status: 'DISBURSED', disbursedAt: now, dueAt },
    $push: { history: { status: 'DISBURSED', actor: req.user._id, at: now, note: 'Funds released' } },
  }, { new: true });
  if (!loan) { res.status(409).json({ message: 'Loan was already processed. Refresh the queue.' }); return; }
  res.json({ loan: serializeLoan(loan) });
});
