// The demo customer, and a place to keep hardship requests. Both live in memory: the customer comes from a seed.
import { monthlyPayment } from './loan.ts';

export interface Customer {
  id: string;
  name: string;
  vehicle: string;
  originalAmount: number;
  balance: number;
  apr: number;
  monthsRemaining: number;
  monthlyPayment: number; // computed, never stored
}

export type HardshipKind = 'pause' | 'biweekly' | 'credit';
export const HARDSHIP_KINDS: HardshipKind[] = ['pause', 'biweekly', 'credit'];
export interface HardshipResult { id: string; kind: HardshipKind; status: 'PENDING'; message: string; storedIn: 'local' }

export const HARDSHIP_MESSAGE = 'Request sent. A TFS specialist will review it.';

export const DEMO_SEED = {
  id: 'demo', name: 'Vijay', vehicle: '2024 Toyota GR86', originalAmount: 34500, balance: 28000, apr: 5.9, monthsRemaining: 48,
};

export function withPayment(c: Omit<Customer, 'monthlyPayment'>): Customer {
  return { ...c, monthlyPayment: monthlyPayment(c.balance, c.apr, c.monthsRemaining) };
}

export interface CustomerRepo {
  source: 'local';
  getCustomer(id: string): Promise<Customer>;
  saveHardship(customerId: string, kind: HardshipKind): Promise<HardshipResult>;
}

export function createLocalRepo(): CustomerRepo {
  let n = 0;
  return {
    source: 'local',
    async getCustomer() { return withPayment(DEMO_SEED); },
    async saveHardship(_id, kind) {
      return { id: `local-${++n}`, kind, status: 'PENDING', message: HARDSHIP_MESSAGE, storedIn: 'local' };
    },
  };
}
