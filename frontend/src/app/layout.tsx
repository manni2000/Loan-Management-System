import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { NotificationProvider } from '@/components/Notifications';
import './globals.css';
import './responsive.css';
export const metadata: Metadata = { title: 'Lumen | Loan Management', description: 'A clear path from application to repayment. Manage lending with Lumen.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><NotificationProvider><AuthProvider>{children}</AuthProvider></NotificationProvider></body></html>; }
