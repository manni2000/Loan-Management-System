'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LayoutDashboard, UsersRound, ShieldCheck, ArrowUpRight, Wallet, LogOut, ChevronDown, Menu, X, CircleHelp, ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { modules } from '@/lib/types';
const icons = { Sales: UsersRound, Sanction: ShieldCheck, Disbursement: ArrowUpRight, Collection: Wallet };
export function Shell({ children, portal = false }: { children: ReactNode; portal?: boolean }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState('');
  return <div className="app-shell">
    <button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={22} /></button>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <Link href={portal ? '/portal' : '/dashboard'} className="brand"><span className="brand-symbol">L</span>lumen<span className="brand-dot">.</span></Link>
      <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
      <div className="workspace-selector"><span className="workspace-icon"><LockKeyhole size={16} /></span><div><strong>{portal ? 'Borrower portal' : 'Operations workspace'}</strong><small>{portal ? 'Your lending journey' : 'Loan management system'}</small></div><ChevronDown size={14} /></div>
      <p className="nav-label">{portal ? 'YOUR ACCOUNT' : 'WORKSPACE'}</p>
      <nav>
        <Link href={portal ? '/portal' : '/dashboard'} className={`nav-item ${pathname === (portal ? '/portal' : '/dashboard') ? 'active' : ''}`} onClick={() => setOpen(false)}><LayoutDashboard size={19} />{portal ? 'My application' : 'Overview'}</Link>
        {!portal && <><p className="nav-label module-label">LOAN OPERATIONS</p>{modules.filter(m => user?.role === 'Admin' || user?.role === m).map(m => { const Icon = icons[m]; return <Link key={m} href={`/dashboard/${m.toLowerCase()}`} className={`nav-item ${pathname.includes(m.toLowerCase()) ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={19} />{m}<ArrowRight className="nav-arrow" size={14} /></Link>; })}</>}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={21} /></span><strong>A little help goes a long way.</strong><p>Understand your workspace and the loan lifecycle.</p><button onClick={() => setHelp(true)}>View quick guide <ArrowUpRight size={15} /></button></div>
        <div className="sidebar-user"><span className="avatar">{user?.name.split(' ').map(n => n[0]).slice(0,2).join('')}</span><div><strong>{user?.name}</strong><small>{user?.role} account</small></div><button title="Sign out" aria-label="Sign out" onClick={() => logout().catch(e => setError(e.message))}><LogOut size={17} /></button></div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </aside>
    <div className="main-wrapper"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{portal ? 'Borrower portal' : pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()!.replace(/^./, c => c.toUpperCase())}</strong></div><div className="topbar-right"><span className="workspace-status"><span /> Secure workspace</span><span className="role-pill">{user?.role}</span><span className="avatar small">{user?.name[0]}</span></div></header><main className="main-content">{children}</main><footer className="app-footer"><span>© {new Date().getFullYear()} Lumen. Lending, made clear.</span><span><LockKeyhole size={12} /> Your workspace is protected</span></footer></div>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e => e.stopPropagation()}><button className="modal-close" aria-label="Close guide" onClick={() => setHelp(false)}><X size={20} /></button><span className="eyebrow">QUICK GUIDE</span><h2 id="guide-title">A clear path from application to repayment.</h2><p>Sales tracks registered borrowers who have not applied. Sanction reviews submitted applications. Disbursement releases approved funds. Collection records repayments and closes fully paid loans.</p><p>Borrowers complete personal details, pass the eligibility check, upload a salary slip, and choose loan terms. The interest rate is fixed at 12% per year.</p><p>Your account role determines which modules and actions you can access.</p><button className="btn primary" onClick={() => setHelp(false)}>Got it <ArrowRight size={16} /></button></section></div>}
  </div>;
}
