import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { User, publicUser } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

export const auth = Router();
const credentials = z.object({ email: z.email().trim().toLowerCase().max(254), password: z.string().min(8).max(72) });
const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax' as const, path: '/' };
auth.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Too many authentication requests. Try again in 15 minutes.' } }));
function session(res: any, user: any) {
  const token = jwt.sign({}, config.secret, { subject: String(user._id), expiresIn: '8h', issuer: 'lumen', audience: 'lumen-app' });
  res.cookie('lumen_session', token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}
auth.post('/register', async (req, res) => {
  const input = credentials.extend({ name: z.string().trim().min(2).max(100) }).parse(req.body);
  if (Buffer.byteLength(input.password, 'utf8') > 72) { res.status(422).json({ message: 'Password must not exceed 72 bytes.' }); return; }
  const user = await User.create({ name: input.name, email: input.email, password: await bcrypt.hash(input.password, 12), role: 'Borrower' });
  session(res, user);
  res.status(201).json({ user: publicUser(user) });
});
auth.post('/login', async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user || !await bcrypt.compare(input.password, user.password)) { res.status(401).json({ message: 'Email or password is incorrect.' }); return; }
  session(res, user);
  res.json({ user: publicUser(user) });
});
auth.post('/logout', (_req, res) => { res.clearCookie('lumen_session', cookieOptions); res.json({ message: 'Signed out.' }); });
auth.get('/me', authenticate, (req, res) => { res.json({ user: publicUser(req.user) }); });
