'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type NoticeInput = { kind: 'success' | 'error' | 'info'; title?: string; message: string; failures?: string[] };
type Notice = NoticeInput & { id: number };
const NoticeContext = createContext<(notice: NoticeInput) => void>(() => {});
export const useNotify = () => useContext(NoticeContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);
  const notify = useCallback((notice: NoticeInput) => {
    const item = { ...notice, id: ++nextId.current };
    setNotices(current => [...current.filter(n =>
      !(notice.kind === 'success' && n.kind === 'error') &&
      !(n.kind === notice.kind && n.message === notice.message)
    ).slice(-2), item]);
  }, []);
  const dismiss = useCallback((id: number) => setNotices(current => current.filter(n => n.id !== id)), []);
  return <NoticeContext.Provider value={notify}>{children}
    {notices.length > 0 && <div className="notification-backdrop" aria-hidden="true" />}
    <div className="notification-stack" aria-label="Notifications">
      {notices.map(notice => <NotificationCard key={notice.id} notice={notice} dismiss={dismiss} />)}
    </div>
  </NoticeContext.Provider>;
}

function NotificationCard({ notice, dismiss }: { notice: Notice; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || notice.kind === 'error') return;
    const timer = setTimeout(() => dismiss(notice.id), 6000);
    return () => clearTimeout(timer);
  }, [paused, notice.id, notice.kind, dismiss]);
  const Icon = notice.kind === 'error' ? AlertCircle : notice.kind === 'success' ? CheckCircle2 : Info;
  return <section className={`notification-card ${notice.kind}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <span className="notification-icon"><Icon size={22} /></span>
    <div className="notification-copy" role={notice.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      <strong>{notice.title || (notice.kind === 'error' ? 'Please check your details' : notice.kind === 'success' ? 'Success' : 'Notice')}</strong>
      <p>{notice.message}</p>
      {!!notice.failures?.length && <ul>{notice.failures.map((failure, index) => <li key={index}>{failure}</li>)}</ul>}
    </div>
    <button className="notification-close" type="button" aria-label="Dismiss notification" onClick={() => dismiss(notice.id)}><X size={18} /></button>
  </section>;
}

export function SuccessNotice({ message }: { message: string }) {
  const notify = useNotify();
  const lastMessage = useRef('');
  useEffect(() => {
    if (message && message !== lastMessage.current) notify({ kind: 'success', message });
    lastMessage.current = message;
  }, [message, notify]);
  return null;
}
