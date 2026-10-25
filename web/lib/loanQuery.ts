// The "try your own loan" values, sent to the API as query parameters. The API validates and does all the math.
export interface LoanInput { balance: number; apr: number; months: number; original?: number; vehicle?: string }

export const LOAN_HINTS = { balance: [1000, 200000], apr: [0, 30], months: [6, 120] } as const;

export function loanQs(loan: LoanInput | null): string {
  if (!loan) return '';
  const q = new URLSearchParams({ balance: String(loan.balance), apr: String(loan.apr), months: String(loan.months) });
  if (loan.original !== undefined) q.set('original', String(loan.original));
  if (loan.vehicle) q.set('vehicle', loan.vehicle);
  return q.toString();
}

export const withQs = (path: string, qs: string): string => (qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path);
