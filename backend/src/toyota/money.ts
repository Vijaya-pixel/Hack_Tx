// Money math. Pure functions, no AI anywhere. Everything the customer sees as a dollar figure comes from here.

export const round2 = (x: number): number => Math.round(x * 100) / 100;
export const round0 = (x: number): number => Math.round(x);

// Standard loan payment: principal, annual rate (0.069 = 6.9%), number of monthly payments.
export function loanPayment(principal: number, apr: number, months: number): number {
  if (!(months > 0)) throw new Error('months must be positive');
  if (apr === 0) return principal / months;
  const r = apr / 12;
  return (principal * r) / (1 - (1 + r) ** -months);
}

// Balance left after `paid` payments of `payment` (never below zero).
export function balanceAfter(principal: number, apr: number, payment: number, paid: number): number {
  if (apr === 0) return Math.max(0, principal - payment * paid);
  const r = apr / 12;
  const grown = principal * (1 + r) ** paid - payment * (((1 + r) ** paid - 1) / r);
  return Math.max(0, grown);
}

// How many months until a balance is gone if you pay `payment` a month. Null if the payment never covers the interest.
export function monthsToPayoff(balance: number, apr: number, payment: number): number | null {
  const r = apr / 12;
  if (payment <= balance * r) return null;
  let b = balance;
  for (let m = 1; m <= 1200; m++) {
    b = b * (1 + r) - payment;
    if (b <= 0.005) return m;
  }
  return null;
}

// Interest paid while paying `payment` a month until the balance is gone.
export function interestToPayoff(balance: number, apr: number, payment: number): number {
  const months = monthsToPayoff(balance, apr, payment);
  if (months === null) return Infinity;
  const r = apr / 12;
  let b = balance;
  let interest = 0;
  for (let m = 1; m <= months; m++) {
    const i = b * r;
    interest += i;
    b = b + i - Math.min(payment, b + i);
  }
  return interest;
}

// Lease payment: depreciation part plus finance part. moneyFactor is roughly apr / 24.
export function leasePayment(capCost: number, residual: number, termMonths: number, moneyFactor: number): number {
  return (capCost - residual) / termMonths + (capCost + residual) * moneyFactor;
}

// Months from "YYYY-MM" to "YYYY-MM" (later minus earlier).
export function monthsBetween(fromMonth: string, toMonth: string): number {
  const [fy, fm] = fromMonth.split('-').map(Number);
  const [ty, tm] = toMonth.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}
