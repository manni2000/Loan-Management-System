import { Schema, model } from 'mongoose';

export const roles = ['Admin', 'Sales', 'Sanction', 'Disbursement', 'Collection', 'Borrower'] as const;
export type Role = typeof roles[number];
const personalSchema = new Schema({
  fullName: { type: String, required: true }, pan: { type: String, required: true },
  dob: { type: String, required: true }, monthlySalary: { type: Number, required: true },
  employment: { type: String, enum: ['Salaried', 'Self-Employed', 'Unemployed'], required: true },
}, { _id: false });
const userSchema = new Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: roles, default: 'Borrower', required: true },
  personal: personalSchema,
  salarySlip: { filename: String, originalName: String, mime: String, size: Number, data: { type: Buffer, select: false } },
}, { timestamps: true });
export const User = model('User', userSchema);
export function publicUser(user: any) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, personal: user.personal,
    salarySlip: user.salarySlip?.filename ? { originalName: user.salarySlip.originalName, size: user.salarySlip.size } : null };
}
