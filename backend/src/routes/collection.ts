import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { Loan, serializeLoan } from '../models/Loan.js';
import { listLoans, validId } from './shared.js';
export const collection = Router();
collection.use(authenticate, authorize('Admin', 'Collection'));
collection.get('/loans', async (_req, res) => { await listLoans(['DISBURSED', 'CLOSED'], res); });
collection.post('/loans/:id/payments', validId, async (req, res) => {
  const input = z.object({ utr: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,40}$/),
    amount: z.number().finite().positive().max(1000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, 'Use at most two decimal places.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
  const loan = await Loan.findById(req.params.id);
  if (!loan) { res.status(404).json({ message: 'Loan not found.' }); return; }
  if (loan.status !== 'DISBURSED') { res.status(409).json({ message: 'Payments can only be recorded for disbursed loans.' }); return; }
  const date = new Date(input.date + 'T00:00:00Z');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const disbursedDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(loan.disbursedAt!);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || input.date > today || input.date < disbursedDay) {
    res.status(422).json({ message: 'Payment date must be valid, on or after disbursement, and not in the future.' }); return;
  }
  const amountPaise = Math.round(input.amount * 100);
  if (amountPaise > loan.totalPaise - loan.paidPaise) { res.status(422).json({ message: 'Payment exceeds the outstanding balance.' }); return; }
  const closed = loan.paidPaise + amountPaise === loan.totalPaise;
  const now = new Date();
  // Compare-and-swap makes the payment, balance and closure one atomic document update.
  // Unique multikey index prevents cross-loan UTR duplication; $ne also prevents same-loan duplicates.
  const updated = await Loan.findOneAndUpdate({ _id: loan._id, status: 'DISBURSED', paidPaise: loan.paidPaise, 'payments.utr': { $ne: input.utr } }, {
    $inc: { paidPaise: amountPaise },
    $set: closed ? { status: 'CLOSED', closedAt: now } : { status: 'DISBURSED' },
    $push: { payments: { utr: input.utr, amountPaise, date: input.date, recordedBy: req.user._id, recordedAt: now },
      history: { status: closed ? 'CLOSED' : 'DISBURSED', actor: req.user._id, at: now, note: closed ? 'Final payment received. Loan closed.' : 'Payment received: ' + input.utr } },
  }, { new: true, runValidators: true });
  if (!updated) { res.status(409).json({ message: 'Duplicate UTR or balance changed. Refresh and retry.' }); return; }
  res.status(201).json({ loan: serializeLoan(updated) });
});
