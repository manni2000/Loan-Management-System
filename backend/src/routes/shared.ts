import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Loan, serializeLoan } from '../models/Loan.js';
export function validId(req: Request, res: Response, next: NextFunction) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ message: 'Invalid loan ID.' }); return; }
  next();
}
export async function listLoans(status: string | string[], res: Response) {
  const loans = await Loan.find({ status: { $in: Array.isArray(status) ? status : [status] } })
    .populate('borrower', 'name email personal salarySlip.originalName').sort({ createdAt: -1 });
  res.json({ loans: loans.map(serializeLoan) });
}
