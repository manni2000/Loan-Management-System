import { Schema, model } from 'mongoose';

export const statuses = ['APPLIED', 'SANCTIONED', 'REJECTED', 'DISBURSED', 'CLOSED'] as const;
const loanSchema = new Schema({
  borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  reference: { type: String, required: true, unique: true },
  principalPaise: { type: Number, required: true }, tenure: { type: Number, required: true },
  rate: { type: Number, default: 12 }, interestPaise: { type: Number, required: true },
  totalPaise: { type: Number, required: true }, paidPaise: { type: Number, default: 0 },
  status: { type: String, enum: statuses, default: 'APPLIED', required: true },
  rejectionReason: String, sanctionedAt: Date, disbursedAt: Date, dueAt: Date, closedAt: Date,
  payments: [{ utr: { type: String, required: true }, amountPaise: { type: Number, required: true },
    date: { type: String, required: true }, recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }, recordedAt: Date }],
  history: [{ status: String, actor: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, note: String }],
}, { timestamps: true });
loanSchema.index({ 'payments.utr': 1 }, { unique: true, sparse: true });
loanSchema.index({ status: 1, createdAt: -1 });
export const Loan = model('Loan', loanSchema);
export function serializeLoan(loan: any) {
  const item = loan.toObject ? loan.toObject() : loan;
  return { ...item, outstandingPaise: item.totalPaise - item.paidPaise };
}
