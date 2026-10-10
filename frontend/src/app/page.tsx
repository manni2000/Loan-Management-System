'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
export default function Home() { const { user, loading } = useAuth(); const router = useRouter(); useEffect(() => { if (!loading) router.replace(user ? user.role === 'Borrower' ? '/portal' : '/dashboard' : '/login'); }, [user, loading, router]); return <div className="loading-screen"><span className="brand-symbol">L</span><p>Opening Lumen…</p></div>; }
