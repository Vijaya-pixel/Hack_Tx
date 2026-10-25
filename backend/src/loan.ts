// Loan math. Money is in dollars as plain numbers and is only rounded when it is shown (see roundMoney).
// Payments are monthly. Weekly extra money is spread over the month (52/12 weeks) and goes to principal.

const WEEKS_PER_MONTH = 52 / 12;
const MAX_MONTHS = 1200; // guards against a payment that never covers the interest

export interface PayoffPoint { month: number; balance: number }
export interface Payoff {
  months: number;
  totalInterest: number;
  totalPaid: number;
  schedule: PayoffPoint[]; // schedule[0] is month 0 (the starting balance)
}
export interface Comparison {
  monthsSaved: number;
  interestSaved: number;
  standard: Payoff & { payoffDate: string };
  withRoundUps: Payoff & { payoffDate: string };
}

// Cents to the next dollar. An exact dollar gives 0.
export function roundUp(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('amountCents must be a non-negative integer');
  const rest = amountCents % 100;
  return rest === 0 ? 0 : 100 - rest;
}

// Share of the original loan already paid down, in percent with one decimal.
export function percentPaid(original: number, balance: number): number {
  if (!(original > 0) || balance < 0) throw new Error('original must be > 0 and balance >= 0');
  return Math.round(Math.min(100, Math.max(0, ((original - balance) / original) * 100)) * 10) / 10;
}

export function roundMoney(x: number): number {
  return Math.round(x * 100) / 100;
}

export function monthlyPayment(balance: number, apr: number, months: number): number {
  if (balance < 0 || apr < 0 || !(months > 0)) throw new Error('balance and apr must be >= 0 and months > 0');
  const r = apr / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

export function payoff(balance: number, apr: number, payment: number, extraPerWeek = 0): Payoff {
  if (balance < 0 || apr < 0 || payment <= 0 || extraPerWeek < 0) throw new Error('invalid payoff inputs');
  const r = apr / 100 / 12;
  const extra = extraPerWeek * WEEKS_PER_MONTH;
  if (payment + extra <= balance * r && balance > 0) throw new Error('Payment does not cover the interest');
  const schedule: PayoffPoint[] = [{ month: 0, balance }];
  let bal = balance;
  let interest = 0;
  let paid = 0;
  let month = 0;
  while (bal > 1e-9 && month < MAX_MONTHS) {
    month++;
    const i = bal * r;
    const due = Math.min(bal + i, payment + extra);
    interest += i;
    paid += due;
    bal = bal + i - due;
    if (bal < 1e-9) bal = 0;
    schedule.push({ month, balance: bal });
  }
  return { months: month, totalInterest: interest, totalPaid: paid, schedule };
}

export function addMonths(start: Date, months: number): string {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export function compare(standard: Payoff, withRoundUps: Payoff, start: Date = new Date()): Comparison {
  return {
    monthsSaved: standard.months - withRoundUps.months,
    interestSaved: standard.totalInterest - withRoundUps.totalInterest,
    standard: { ...standard, payoffDate: addMonths(start, standard.months) },
    withRoundUps: { ...withRoundUps, payoffDate: addMonths(start, withRoundUps.months) },
  };
}

// Half the payment every two weeks is 26 half-payments = 13 full payments a year, one more than monthly.
// That extra payment a year is payment / 12 a month, or payment / 52 a week.
export function biweekly(balance: number, apr: number, payment: number, start: Date = new Date()): Comparison {
  const standard = payoff(balance, apr, payment, 0);
  const swapped = payoff(balance, apr, payment, payment / 52);
  return compare(standard, swapped, start);
}
