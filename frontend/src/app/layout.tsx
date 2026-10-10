import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';
export const metadata: Metadata = { title: 'Lumen | Loan Management', description: 'A clear path from application to repayment. Manage lending with Lumen.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>; }
