'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LayoutDashboard, UsersRound, ShieldCheck, ArrowUpRight, Wallet, LogOut, Menu, X, ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { modules } from '@/lib/types';
const icons = { Sales: UsersRound, Sanction: ShieldCheck, Disbursement: ArrowUpRight, Collection: Wallet };
export function Shell({ children, portal = false }: { children: ReactNode; portal?: boolean }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [compact, setCompact] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1024px)');
    const update = () => { setCompact(query.matches); setOpen(false); };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open || !compact) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLButtonElement>('.mobile-close')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const items = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      menuRef.current?.focus();
    };
  }, [open, compact]);
  return <div className="app-shell">
    <button ref={menuRef} className="mobile-menu" aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(true)}><Menu size={22} /></button>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside ref={sidebarRef} id="workspace-navigation" inert={compact && !open} className={`sidebar ${open ? 'is-open' : ''}`}>
      <Link href={portal ? '/portal' : '/dashboard'} className="brand"><span className="brand-symbol">L</span>lumen<span className="brand-dot">.</span></Link>
      <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
      <div className="workspace-title"><strong>{portal ? 'Borrower portal' : 'Operations workspace'}</strong><small>{portal ? 'Your lending journey' : 'Loan management system'}</small></div>
      <p className="nav-label">{portal ? 'YOUR ACCOUNT' : 'WORKSPACE'}</p>
      <nav>
        <Link href={portal ? '/portal' : '/dashboard'} className={`nav-item ${pathname === (portal ? '/portal' : '/dashboard') ? 'active' : ''}`} onClick={() => setOpen(false)}><LayoutDashboard size={19} />{portal ? 'My application' : 'Overview'}</Link>
        {!portal && <><p className="nav-label module-label">LOAN OPERATIONS</p>{modules.filter(m => user?.role === 'Admin' || user?.role === m).map(m => { const Icon = icons[m]; return <Link key={m} href={`/dashboard/${m.toLowerCase()}`} className={`nav-item ${pathname.includes(m.toLowerCase()) ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={19} />{m}<ArrowRight className="nav-arrow" size={14} /></Link>; })}</>}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user"><span className="avatar">{user?.name.split(' ').map(n => n[0]).slice(0,2).join('')}</span><div><strong>{user?.name}</strong><small>{user?.role} account</small></div><button title="Sign out" aria-label="Sign out" onClick={() => logout().catch(e => setError(e.message))}><LogOut size={17} /></button></div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </aside>
    <div className="main-wrapper"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{portal ? 'Borrower portal' : pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()!.replace(/^./, c => c.toUpperCase())}</strong></div><div className="topbar-right"><span className="workspace-status"><span /> Secure workspace</span><span className="role-pill">{user?.role}</span><span className="avatar small">{user?.name[0]}</span></div></header><main className="main-content">{children}</main><footer className="app-footer"><span>© {new Date().getFullYear()} Lumen. Lending, made clear.</span><span><LockKeyhole size={12} /> Your workspace is protected</span></footer></div>
  </div>;
}
