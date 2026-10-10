import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import path from 'node:path';
import { config } from './config.js';
import { auth } from './routes/auth.js';
import { borrower } from './routes/borrower.js';
import { sales } from './routes/sales.js';
import { sanction } from './routes/sanction.js';
import { disbursement } from './routes/disbursement.js';
import { collection } from './routes/collection.js';
import { operations } from './routes/operations.js';
import { authenticate } from './middleware/auth.js';
import { User } from './models/User.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.frontend, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Too many requests. Try again shortly.' } }));
app.use((req, res, next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== config.frontend) {
    res.status(403).json({ message: 'Request origin is not allowed.' }); return;
  }
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers['sec-fetch-site'] === 'cross-site') {
    res.status(403).json({ message: 'Cross-site requests are not allowed.' }); return;
  }
  next();
});
app.get('/api/health', (_req, res) => { const ready = mongoose.connection.readyState === 1; res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'database unavailable' }); });
app.use('/api/auth', auth);
app.use('/api/borrower', borrower);
app.use('/api/sales', sales);
app.use('/api/sanction', sanction);
app.use('/api/disbursement', disbursement);
app.use('/api/collection', collection);
app.use('/api/operations', operations);
app.get('/api/documents/:userId', authenticate, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) { res.status(400).json({ message: 'Invalid user ID.' }); return; }
  const isOwner = req.user.role === 'Borrower' && String(req.user._id) === req.params.userId;
  if (!isOwner && !['Admin','Sanction'].includes(req.user.role)) { res.status(403).json({ message: 'You do not have access to this document.' }); return; }
  const user = await User.findById(req.params.userId);
  if (!user?.salarySlip?.filename) { res.status(404).json({ message: 'Document not found.' }); return; }
  res.setHeader('Cache-Control', 'private, no-store');
  res.download(path.join(config.uploads, user.salarySlip.filename), user.salarySlip.originalName || 'salary-slip', error => {
    if (error && !res.headersSent) res.status(404).json({ message: 'Document file is unavailable.' });
  });
});
app.use((_req, res) => { res.status(404).json({ message: 'Endpoint not found.' }); });
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) { res.status(422).json({ message: 'Please check your input.', failures: error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }); return; }
  if (error instanceof multer.MulterError) { res.status(422).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller.' : 'Upload exactly one file.' }); return; }
  if (error.code === 11000) { res.status(409).json({ message: error.keyPattern?.['payments.utr'] ? 'This UTR has already been recorded.' : error.keyPattern?.borrower ? 'You already have a submitted loan application.' : 'This email is already registered.' }); return; }
  if (error.type === 'entity.parse.failed') { res.status(400).json({ message: 'Invalid JSON body.' }); return; }
  if (error.type === 'entity.too.large') { res.status(413).json({ message: 'Request body is too large.' }); return; }
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
