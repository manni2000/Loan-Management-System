import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config, validateConfig } from './config.js';
import { User, roles } from './models/User.js';
import { Loan } from './models/Loan.js';
import { quote } from './services/eligibility.js';
import { connectDatabase } from './database.js';

validateConfig();
await connectDatabase();
await Promise.all([User.init(), Loan.init()]);
const password = await bcrypt.hash('Lumen@123', 12);
for (const role of roles) {
  const email = `${role.toLowerCase()}@lumen.test`;
  if (!await User.exists({ email })) await User.create({ name: role === 'Borrower' ? 'Alex Morgan' : `${role} Executive`, email, password, role });
}
await mkdir(config.uploads, { recursive: true });
const stream = 'BT /F1 18 Tf 50 730 Td (Lumen - Sample salary slip for evaluation) Tj ET\n';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`];
let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10,'0') + ' 00000 n \n').join('');
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await writeFile(path.join(config.uploads, 'sample-salary-slip.pdf'), pdf);
const examples = [
  ['Aarav Sharma','APPLIED',250000,180], ['Priya Nair','APPLIED',125000,90], ['Rohan Mehta','APPLIED',350000,365],
  ['Ishita Patel','SANCTIONED',200000,120], ['Kabir Singh','SANCTIONED',75000,60],
  ['Ananya Rao','DISBURSED',300000,180], ['Vikram Desai','DISBURSED',150000,90], ['Neha Kapoor','CLOSED',100000,60],
  ['Arjun Reddy','REJECTED',450000,365], ['Meera Joshi','LEAD',0,0], ['Dev Malhotra','LEAD',0,0],
] as const;
for (let i = 0; i < examples.length; i++) {
  const [name, status, amount, tenure] = examples[i];
  const email = name.toLowerCase().replace(' ', '.') + '@lumen.test';
  if (await User.exists({ email })) continue;
  const user = await User.create({ name, email, password, role: 'Borrower',
    ...(status === 'LEAD' && i % 2 === 0 ? {} : { personal: { fullName: name, pan: 'ABCPD1234E', dob: '1993-06-15', monthlySalary: 45000 + i * 3000, employment: 'Salaried' } }),
    ...(status !== 'LEAD' ? { salarySlip: { filename: 'sample-salary-slip.pdf', originalName: 'salary-slip.pdf', mime: 'application/pdf', size: Buffer.byteLength(pdf), data: Buffer.from(pdf) } } : {}),
    createdAt: new Date(Date.now() - (i + 1) * 86400000),
  });
  if (status === 'LEAD') continue;
  const terms = quote(amount, tenure);
  const createdAt = new Date(Date.now() - (i + 2) * 86400000);
  const disbursedAt = new Date(Date.now() - 86400000);
  const active = status === 'DISBURSED' || status === 'CLOSED';
  const paidPaise = status === 'CLOSED' ? terms.totalPaise : active ? 2500000 : 0;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await Loan.create({ borrower: user._id, reference: 'LM-' + String(1024 + i), ...terms, status, paidPaise, createdAt,
    rejectionReason: status === 'REJECTED' ? 'Salary documentation could not be verified. Please contact support.' : undefined,
    sanctionedAt: ['SANCTIONED','DISBURSED','CLOSED'].includes(status) ? createdAt : undefined,
    disbursedAt: active ? disbursedAt : undefined, dueAt: active ? new Date(disbursedAt.getTime() + tenure * 86400000) : undefined,
    closedAt: status === 'CLOSED' ? new Date() : undefined,
    payments: active ? [{ utr: 'SEEDUTR' + (1024 + i), amountPaise: paidPaise, date, recordedAt: new Date() }] : [],
    history: [{ status: 'APPLIED', actor: user._id, at: createdAt, note: 'Application submitted' },
      ...(status !== 'APPLIED' ? [{ status, at: active ? disbursedAt : createdAt, note: 'Seeded evaluation record' }] : [])],
  });
}
console.log('Seed complete. Role accounts: admin/sales/sanction/disbursement/collection/borrower@lumen.test. Password: Lumen@123');
await mongoose.disconnect();
