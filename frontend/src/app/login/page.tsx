'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff, Check, ArrowUpRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useNotify } from '@/components/Notifications';
import { ErrorBox } from '@/components/UI';
import type { User } from '@/lib/types';
const evaluatorRoles = ['Admin', 'Sales', 'Sanction', 'Disbursement', 'Collection', 'Borrower'] as const;
export default function Login() {
  const { user, setUser, loading } = useAuth(); const notify = useNotify(); const router = useRouter();
  const [register, setRegister] = useState(false); const [show, setShow] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [failures, setFailures] = useState<string[]>([]);
  useEffect(() => { if (!loading && user) router.replace(user.role === 'Borrower' ? '/portal' : '/dashboard'); }, [user, loading, router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setFailures([]);
    try { const data = await api<{ user: User }>(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify({ email, password, ...(register ? { name } : {}) }) }); const session = await api<{ user: User }>('/auth/me'); setUser(session.user); notify({ kind: 'success', message: register ? 'Your borrower account has been created. Welcome to Lumen!' : 'Signed in successfully. Welcome back!' }); router.replace(data.user.role === 'Borrower' ? '/portal' : '/dashboard'); }
    catch (e) { setError((e as Error).message); setFailures(e instanceof ApiError ? e.failures : []); } finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-story"><div className="brand"><span className="brand-symbol">L</span>lumen<span className="brand-dot">.</span></div><div className="auth-story-content"><span className="eyebrow">A CLEARER WAY TO LEND</span><h1>Big possibilities.<br />Simple lending.</h1><p>From the first application to the final repayment, bring every step together in one thoughtful workspace.</p><div className="auth-illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="illustration-card"><span className="illustration-icon"><ArrowUpRight size={29} /></span><small>YOUR NEXT CHAPTER</small><strong>Within reach.</strong><div className="illustration-line" /><span><Check size={15} /> Clear terms. Confident decisions.</span></div><span className="floating-check"><ShieldCheck size={29} /></span></div></div><div className="auth-story-footer"><ShieldCheck size={17} /> Secure by design. Built around you.</div></section>
    <section className="auth-form-side"><div className="auth-form-wrapper"><span className="eyebrow">WELCOME TO LUMEN</span><h2>{register ? 'Your journey starts here.' : 'Good to see you again.'}</h2><p className="muted">{register ? 'Create your borrower account to get started.' : 'Sign in to pick up where you left off.'}</p><div className="auth-tabs"><button className={!register ? 'selected' : ''} onClick={() => { setRegister(false); setError(''); }}>Sign in</button><button className={register ? 'selected' : ''} onClick={() => { setRegister(true); setError(''); }}>Create account</button></div>
      <form onSubmit={submit} className="form-stack">{register && <label>Full name<input required autoComplete="name" minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" /></label>}<label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<div className="password-field"><input required minLength={8} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <ErrorBox message={error} failures={failures} />}<button disabled={busy} className="btn primary full">{busy ? 'Please wait…' : register ? 'Create borrower account' : 'Sign in to workspace'}<ArrowRight size={17} /></button></form>
      {!register && <div className="demo-accounts"><div><strong>Role-based access</strong><span>Evaluator accounts</span></div><p>Choose a role to fill in its login credentials.</p><div className="demo-role-grid">{evaluatorRoles.map(role => <button type="button" disabled={busy} key={role} onClick={() => { setEmail(`${role.toLowerCase()}@lumen.test`); setPassword('Lumen@123'); setError(''); setFailures([]); }}>{role}<ArrowUpRight size={13} /></button>)}</div><small>Email: <code>role@lumen.test</code> · Password: <code>Lumen@123</code></small></div>}
      <p className="auth-note"><ShieldCheck size={14} /> Your information is encrypted in transit when served over HTTPS.</p>
    </div></section></main>;
}
