import { type Loan } from './types';
export function exportCsv(rows: (string | number)[][], name: string) {
  const csv = rows.map(row => row.map(value => { let s = String(value); if (/^[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `lumen-${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}
export function exportLoans(loans: Loan[], name: string) { exportCsv([['Loan ID','Borrower','Email','Principal INR','Tenure days','Interest INR','Total repayment INR','Paid INR','Outstanding INR','Status','Applied on'], ...loans.map(l => [l.reference,l.borrower.name,l.borrower.email,l.principalPaise/100,l.tenure,l.interestPaise/100,l.totalPaise/100,l.paidPaise/100,l.outstandingPaise/100,l.status,l.createdAt])],name); }
