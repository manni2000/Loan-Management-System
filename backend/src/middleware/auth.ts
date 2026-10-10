import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User, type Role } from '../models/User.js';

declare global { namespace Express { interface Request { user?: any } } }
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.lumen_session;
  if (!token) { res.status(401).json({ message: 'Please sign in to continue.' }); return; }
  let id: string;
  try {
    const payload = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer: 'lumen', audience: 'lumen-app' }) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Invalid subject');
    id = payload.sub;
  } catch { res.status(401).json({ message: 'Your session expired. Please sign in again.' }); return; }
  try {
    const user = await User.findById(id);
    if (!user) { res.status(401).json({ message: 'Account no longer exists.' }); return; }
    req.user = user;
    next();
  } catch (error) { next(error); }
}
export function authorize(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ message: 'Authentication required.' }); return; }
    if (!allowed.includes(req.user.role)) { res.status(403).json({ message: 'Your role does not have access to this module.' }); return; }
    next();
  };
}
