'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useNotify } from './Notifications';

const AuthContext = createContext<{ user: User | null; loading: boolean; setUser: (user: User | null) => void; logout: () => Promise<void> }>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const notify = useNotify();
  useEffect(() => { api<{ user: User }>('/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); notify({ kind: 'success', message: 'You have been signed out successfully.' }); router.replace('/login'); }
  return <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export function Protected({ children, borrower = false }: { children: ReactNode; borrower?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (user && (borrower ? user.role !== 'Borrower' : user.role === 'Borrower')) router.replace(user.role === 'Borrower' ? '/portal' : '/dashboard');
  }, [user, loading, borrower, router]);
  if (loading || !user || (borrower ? user.role !== 'Borrower' : user.role === 'Borrower')) return <div className="loading-screen"><span className="brand-symbol">L</span><p>Opening your workspace…</p></div>;
  return children;
}
