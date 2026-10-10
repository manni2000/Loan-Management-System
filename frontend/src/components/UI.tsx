'use client';
import { X, Search, ArrowUpRight, Inbox, AlertCircle } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
export function Badge({ status }: { status: string }) { return <span className={`badge ${status.toLowerCase().replaceAll(' ', '-')}`}><span />{({ APPLIED: 'Applied', SANCTIONED: 'Sanctioned', DISBURSED: 'Disbursed', CLOSED: 'Closed', REJECTED: 'Rejected' } as Record<string,string>)[status] || status}</span>; }
export function ErrorBox({ message, failures = [] }: { message: string; failures?: string[] }) { return <div className="error-box" role="alert"><AlertCircle size={18} /><div>{message}{failures.length > 0 && <ul>{failures.map(f => <li key={f}>{f}</li>)}</ul>}</div></div>; }
export function Empty({ title = 'You’re all caught up', detail = 'New records will appear here when they are ready.' }: { title?: string; detail?: string }) { return <div className="empty-state"><span><Inbox size={28} /></span><h3>{title}</h3><p>{detail}</p></div>; }
export function SearchField({ value, onChange, placeholder = 'Search name, email or loan ID…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) { return <label className="search-field"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />{value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></button>}</label>; }
export function Stat({ label, value, icon, note, accent = false }: { label: string; value: string | number; icon: ReactNode; note: string; accent?: boolean }) { return <div className={`stat-card ${accent ? 'accent' : ''}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><div className="stat-note"><span className="tiny-dot" />{note}</div></div>; }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button, input, a')?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, a[href], select');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={onClose}><section ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={20} /></button><span className="eyebrow">LUMEN OPERATIONS</span><h2>{title}</h2>{children}</section></div>;
}
export function SectionHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) { return <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{children || <ArrowUpRight size={18} />}</div>; }
