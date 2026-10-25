// The demo customer and where she or he is stored: Snowflake when connected, a local seed otherwise.
import { monthlyPayment } from './loan.ts';
import type { SnowflakeClient } from './snowflake.ts';

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
export interface HardshipResult { id: string; kind: HardshipKind; status: 'PENDING'; message: string; storedIn: 'snowflake' | 'local' }

export const HARDSHIP_MESSAGE = 'Request sent. A TFS specialist will review it.';

export const ALEX_SEED = {
  id: 'alex', name: 'Alex Rivera', vehicle: '2024 Toyota RAV4 Hybrid', originalAmount: 34500, balance: 28000, apr: 5.9, monthsRemaining: 48,
};

export function withPayment(c: Omit<Customer, 'monthlyPayment'>): Customer {
  return { ...c, monthlyPayment: monthlyPayment(c.balance, c.apr, c.monthsRemaining) };
}

export interface CustomerRepo {
  source: 'snowflake' | 'local';
  getCustomer(id: string): Promise<Customer>;
  saveHardship(customerId: string, kind: HardshipKind): Promise<HardshipResult>;
}

export function createLocalRepo(): CustomerRepo {
  let n = 0;
  return {
    source: 'local',
    async getCustomer() { return withPayment(ALEX_SEED); },
    async saveHardship(_id, kind) {
      return { id: `local-${++n}`, kind, status: 'PENDING', message: HARDSHIP_MESSAGE, storedIn: 'local' };
    },
  };
}

interface CustomerRow { CUSTOMER_ID: string; NAME: string; VEHICLE: string; ORIGINAL_AMOUNT: number; BALANCE: number; APR: number; MONTHS_REMAINING: number }

export function createSnowflakeRepo(client: SnowflakeClient): CustomerRepo {
  return {
    source: 'snowflake',
    async getCustomer(id) {
      const rows = await client.query<CustomerRow>(
        `SELECT c.CUSTOMER_ID, c.NAME, l.VEHICLE, l.ORIGINAL_AMOUNT::FLOAT AS ORIGINAL_AMOUNT, l.BALANCE::FLOAT AS BALANCE, l.APR::FLOAT AS APR, l.MONTHS_REMAINING::INT AS MONTHS_REMAINING
         FROM CUSTOMERS c JOIN LOANS l ON l.CUSTOMER_ID = c.CUSTOMER_ID WHERE c.CUSTOMER_ID = ?`, [id]);
      const r = rows[0];
      if (!r) throw new Error(`No customer ${id} in Snowflake`);
      return withPayment({ id: r.CUSTOMER_ID, name: r.NAME, vehicle: r.VEHICLE, originalAmount: Number(r.ORIGINAL_AMOUNT ?? r.BALANCE), balance: Number(r.BALANCE), apr: Number(r.APR), monthsRemaining: Number(r.MONTHS_REMAINING) });
    },
    async saveHardship(customerId, kind) {
      const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await client.query(
        `INSERT INTO HARDSHIP_REQUESTS (REQUEST_ID, CUSTOMER_ID, KIND, STATUS) VALUES (?, ?, ?, 'PENDING')`, [requestId, customerId, kind]);
      return { id: requestId, kind, status: 'PENDING', message: HARDSHIP_MESSAGE, storedIn: 'snowflake' };
    },
  };
}

// Statements for `npm run snowflake:setup`. Kept here so a test can check them.
export const SETUP_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS CUSTOMERS (CUSTOMER_ID STRING PRIMARY KEY, NAME STRING NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS LOANS (LOAN_ID STRING PRIMARY KEY, CUSTOMER_ID STRING NOT NULL, VEHICLE STRING NOT NULL, ORIGINAL_AMOUNT NUMBER(12,2),
     BALANCE NUMBER(12,2) NOT NULL, APR NUMBER(5,2) NOT NULL, MONTHS_REMAINING NUMBER(4,0) NOT NULL)`,
  `ALTER TABLE LOANS ADD COLUMN IF NOT EXISTS ORIGINAL_AMOUNT NUMBER(12,2)`,
  `CREATE TABLE IF NOT EXISTS HARDSHIP_REQUESTS (REQUEST_ID STRING PRIMARY KEY, CUSTOMER_ID STRING NOT NULL, KIND STRING NOT NULL,
     STATUS STRING NOT NULL, CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP())`,
];

export async function seedSnowflake(client: SnowflakeClient): Promise<void> {
  for (const sql of SETUP_SQL) await client.query(sql);
  const a = ALEX_SEED;
  await client.query('DELETE FROM CUSTOMERS WHERE CUSTOMER_ID = ?', [a.id]);
  await client.query('DELETE FROM LOANS WHERE CUSTOMER_ID = ?', [a.id]);
  await client.query('INSERT INTO CUSTOMERS (CUSTOMER_ID, NAME) VALUES (?, ?)', [a.id, a.name]);
  await client.query('INSERT INTO LOANS (LOAN_ID, CUSTOMER_ID, VEHICLE, ORIGINAL_AMOUNT, BALANCE, APR, MONTHS_REMAINING) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [`loan-${a.id}`, a.id, a.vehicle, a.originalAmount, a.balance, a.apr, a.monthsRemaining]);
}
