import { z } from 'zod';

export const personalInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  pan: z.string().trim().toUpperCase().max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlySalary: z.number().finite().min(0).max(100000000),
  employment: z.enum(['Salaried', 'Self-Employed', 'Unemployed']),
});
export type Personal = z.infer<typeof personalInput>;
export function eligibility(personal: Personal, today = new Date()) {
  const failures: string[] = [];
  const birth = new Date(personal.dob + 'T00:00:00Z');
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== personal.dob || age < 23 || age > 50) failures.push('Applicant must be between 23 and 50 years old.');
  if (personal.monthlySalary < 25000) failures.push('Monthly salary must be at least ₹25,000.');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(personal.pan)) failures.push('PAN must contain five letters, four digits, and one letter (e.g. ABCPD1234E).');
  if (personal.employment === 'Unemployed') failures.push('Unemployed applicants are not eligible.');
  return { eligible: failures.length === 0, failures, age };
}
export function quote(amount: number, tenure: number) {
  const principalPaise = Math.round(amount * 100);
  const interestPaise = Math.round(principalPaise * 12 * tenure / (365 * 100));
  return { principalPaise, interestPaise, totalPaise: principalPaise + interestPaise, rate: 12, tenure };
}
