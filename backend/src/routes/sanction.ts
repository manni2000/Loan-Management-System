import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { Loan, serializeLoan } from '../models/Loan.js';
import { listLoans, validId } from './shared.js';
export const sanction = Router();
sanction.use(authenticate, authorize('Admin', 'Sanction'));
sanction.get('/loans', async (_req, res) => { await listLoans(['APPLIED', 'REJECTED'], res); });
sanction.patch('/loans/:id/decision', validId, async (req, res) => {
  const input = z.discriminatedUnion('decision', [z.object({ decision: z.literal('approve') }),
    z.object({ decision: z.literal('reject'), reason: z.string().trim().min(3).max(500) })]).parse(req.body);
  const status = input.decision === 'approve' ? 'SANCTIONED' : 'REJECTED';
  const changes = input.decision === 'approve' ? { status, sanctionedAt: new Date() } : { status, rejectionReason: input.reason };
  const loan = await Loan.findOneAndUpdate({ _id: req.params.id, status: 'APPLIED' }, {
    $set: changes, $push: { history: { status, actor: req.user._id, at: new Date(), note: input.decision === 'reject' ? input.reason : 'Loan approved' } },
  }, { new: true, runValidators: true });
  if (!loan) { res.status(409).json({ message: 'Only applied loans can be reviewed. Refresh the queue.' }); return; }
  res.json({ loan: serializeLoan(loan) });
});
