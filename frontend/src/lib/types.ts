export type Role = 'Admin' | 'Sales' | 'Sanction' | 'Disbursement' | 'Collection' | 'Borrower';
export type Personal = { fullName: string; pan: string; dob: string; monthlySalary: number; employment: 'Salaried' | 'Self-Employed' | 'Unemployed' };
export type User = { id: string; name: string; email: string; role: Role; personal?: Personal; salarySlip?: { originalName: string; size: number } | null };
export type Loan = { _id: string; reference: string; borrower: { _id: string; name: string; email: string; personal?: Personal; salarySlip?: { originalName: string } }; principalPaise: number; interestPaise: number; totalPaise: number; paidPaise: number; outstandingPaise: number; tenure: number; rate: number; status: 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED'; createdAt: string; dueAt?: string; disbursedAt?: string; rejectionReason?: string; payments: { _id: string; utr: string; amountPaise: number; date: string; recordedAt: string }[]; history: { status: string; at: string; note: string }[] };
export type Lead = { _id: string; name: string; email: string; createdAt: string; personal?: Personal; hasSalarySlip: boolean };
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
export const dateLabel = (date?: string) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const modules = ['Sales', 'Sanction', 'Disbursement', 'Collection'] as const;
