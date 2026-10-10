import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { User, publicUser } from '../models/User.js';
import { Loan, serializeLoan } from '../models/Loan.js';
import { eligibility, personalInput, quote } from '../services/eligibility.js';

export const borrower = Router();
borrower.use(authenticate, authorize('Borrower'));
borrower.get('/application', async (req, res) => {
  const loan = await Loan.findOne({ borrower: req.user._id });
  res.json({ user: publicUser(req.user), loan: loan ? serializeLoan(loan) : null });
});
borrower.put('/personal', async (req, res) => {
  if (await Loan.exists({ borrower: req.user._id })) { res.status(409).json({ message: 'A submitted application cannot be edited.' }); return; }
  const input = personalInput.parse(req.body);
  const result = eligibility(input);
  if (!result.eligible) { res.status(422).json({ message: 'Your application does not meet the eligibility requirements.', ...result }); return; }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { personal: input } }, { new: true, runValidators: true });
  res.json({ user: publicUser(user), ...result });
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
borrower.post('/salary-slip', upload.single('file'), async (req, res) => {
  if (await Loan.exists({ borrower: req.user._id })) { res.status(409).json({ message: 'A submitted application cannot be edited.' }); return; }
  if (!req.user.personal || !eligibility(req.user.personal).eligible) { res.status(422).json({ message: 'Complete eligible personal details first.' }); return; }
  const file = req.file;
  if (!file) { res.status(422).json({ message: 'Choose a salary slip.' }); return; }
  const formats = [
    { mime: 'application/pdf', ext: '.pdf', matches: file.buffer.subarray(0, 5).toString() === '%PDF-' },
    { mime: 'image/png', ext: '.png', matches: file.buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
    { mime: 'image/jpeg', ext: '.jpg', matches: file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255 },
  ];
  const format = formats.find(f => f.matches && f.mime === file.mimetype);
  if (!format || !/\.(pdf|jpe?g|png)$/i.test(file.originalname)) { res.status(422).json({ message: 'Upload a valid PDF, JPG, or PNG file (max 5 MB).' }); return; }
  await mkdir(config.uploads, { recursive: true });
  const filename = randomUUID() + format.ext;
  await writeFile(path.join(config.uploads, filename), file.buffer, { flag: 'wx' });
  let user;
  try {
    user = await User.findByIdAndUpdate(req.user._id, { $set: { salarySlip: { filename, originalName: path.basename(file.originalname), mime: format.mime, size: file.size } } }, { new: true });
  } catch (error) { await unlink(path.join(config.uploads, filename)).catch(() => {}); throw error; }
  res.status(201).json({ user: publicUser(user) });
});
borrower.post('/loans', async (req, res) => {
  const input = z.object({ amount: z.number().int().min(50000).max(500000), tenure: z.number().int().min(30).max(365) }).parse(req.body);
  if (!req.user.personal) { res.status(422).json({ message: 'Complete personal details first.' }); return; }
  const result = eligibility(req.user.personal);
  if (!result.eligible) { res.status(422).json({ message: 'Eligibility check failed.', ...result }); return; }
  if (!req.user.salarySlip?.filename) { res.status(422).json({ message: 'Upload a salary slip first.' }); return; }
  const loan = await Loan.create({ borrower: req.user._id, reference: 'LM-' + randomUUID().slice(0, 8).toUpperCase(),
    ...quote(input.amount, input.tenure), status: 'APPLIED', history: [{ status: 'APPLIED', actor: req.user._id, at: new Date(), note: 'Application submitted' }] });
  res.status(201).json({ loan: serializeLoan(loan) });
});
