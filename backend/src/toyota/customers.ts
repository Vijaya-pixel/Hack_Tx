// Five synthetic customers. Every name, balance and mileage here is invented.
import { leasePayment } from './money.ts';

export interface Vehicle { model: string; year: number; msrp: number; mpg: number }
export interface LoanContract { kind: 'loan'; startMonth: string; termMonths: number; amountFinanced: number; apr: number }
export interface LeaseContract {
  kind: 'lease'; startMonth: string; termMonths: number; capCost: number; residual: number; moneyFactor: number;
  allowedMiles: number; overageFee: number; dispositionFee: number; buyoutApr: number;
}
export type Situation = 'lease-end-over-miles' | 'loan-nearly-paid' | 'hardship' | 'growing-family' | 'lease-end-equity';

export interface Customer {
  id: string; name: string; situation: Situation;
  headline: string;     // one line: what is going on
  story: string;        // two sentences of context
  vehicle: Vehicle; contract: LoanContract | LeaseContract;
  milesNow: number; monthlyIncome: number;
  recentMilesPerMonth: number; // how fast they have driven over the last 8 weeks (synthetic)
  wants: string[];      // catalog ids the customer is considering
}

// Vehicles a customer could move to. Synthetic prices.
export interface CatalogItem { id: string; label: string; msrp: number; mpg: number; used?: boolean; leaseResidualPct?: number }
export const CATALOG: Record<string, CatalogItem> = {
  'rav4-hybrid': { id: 'rav4-hybrid', label: 'RAV4 Hybrid', msrp: 36500, mpg: 40, leaseResidualPct: 0.64 },
  'grand-highlander': { id: 'grand-highlander', label: 'Grand Highlander', msrp: 46000, mpg: 24 },
  'highlander-certified': { id: 'highlander-certified', label: 'Certified Highlander', msrp: 34000, mpg: 24, used: true },
  'corolla-new': { id: 'corolla-new', label: 'new Corolla', msrp: 23500, mpg: 35 },
};

// Rates and prices the whole demo agrees on. Shown to the customer as assumptions.
export const ASSUMPTIONS = {
  newLoanApr: 0.065, usedLoanApr: 0.069, newLoanMonths: 60,
  promoMoneyFactor: 0.0014, buyoutFee: 350, buyoutMonths: 48, gasPrice: 3.5, extraPaymentDefault: 100,
};

const lease = (c: Omit<LeaseContract, 'kind' | 'moneyFactor' | 'buyoutApr'> & { moneyFactor?: number }): LeaseContract =>
  ({ kind: 'lease', moneyFactor: 0.0014, buyoutApr: 0.069, ...c });

export const CUSTOMERS: Customer[] = [
  {
    id: 'maya', name: 'Maya', situation: 'lease-end-over-miles',
    headline: 'Her lease ends in 3 months and she is over her mileage.',
    story: 'Maya leased a RAV4 and started a longer commute. She wants to know what happens at lease end.',
    vehicle: { model: 'RAV4', year: 2024, msrp: 33500, mpg: 28 },
    contract: lease({ startMonth: '2024-01', termMonths: 36, capCost: 33500, residual: 21775, allowedMiles: 36000, overageFee: 0.25, dispositionFee: 395 }),
    milesNow: 38500, monthlyIncome: 5800, recentMilesPerMonth: 2000, wants: ['rav4-hybrid'],
  },
  {
    id: 'jake', name: 'Jake', situation: 'loan-nearly-paid',
    headline: 'His car loan is almost paid off.',
    story: 'Jake has a Corolla with only a few payments left. He is thinking about getting something newer.',
    vehicle: { model: 'Corolla', year: 2022, msrp: 22000, mpg: 32 },
    contract: { kind: 'loan', startMonth: '2022-08', termMonths: 60, amountFinanced: 19000, apr: 0.049 },
    milesNow: 52000, monthlyIncome: 4600, recentMilesPerMonth: 1040, wants: ['corolla-new'],
  },
  {
    id: 'sam', name: 'Sam', situation: 'hardship',
    headline: 'He lost his job and the payment is getting hard to cover.',
    story: 'Sam has a Camry loan with a long way to go. His income dropped and he wants breathing room without hurting his credit.',
    vehicle: { model: 'Camry', year: 2024, msrp: 28500, mpg: 32 },
    contract: { kind: 'loan', startMonth: '2024-04', termMonths: 72, amountFinanced: 24000, apr: 0.069 },
    milesNow: 31000, monthlyIncome: 1900, recentMilesPerMonth: 1033, wants: [],
  },
  {
    id: 'priya', name: 'Priya', situation: 'growing-family',
    headline: 'A baby is on the way and the Corolla is getting small.',
    story: 'Priya has built up equity in her Corolla. She wants a bigger car without a payment that strains the budget.',
    vehicle: { model: 'Corolla', year: 2022, msrp: 22500, mpg: 32 },
    contract: { kind: 'loan', startMonth: '2022-10', termMonths: 60, amountFinanced: 17500, apr: 0.055 },
    milesNow: 44000, monthlyIncome: 6400, recentMilesPerMonth: 917, wants: ['grand-highlander', 'highlander-certified'],
  },
  {
    id: 'lena', name: 'Lena', situation: 'lease-end-equity',
    headline: 'Her lease ends next month, and the car may be worth more than the buyout price.',
    story: 'Lena drove far fewer miles than her lease allowed. She is deciding between returning the car and keeping it.',
    vehicle: { model: 'Camry', year: 2023, msrp: 29000, mpg: 32 },
    contract: lease({ startMonth: '2023-11', termMonths: 36, capCost: 29000, residual: 15950, allowedMiles: 36000, overageFee: 0.25, dispositionFee: 395 }),
    milesNow: 28000, monthlyIncome: 5200, recentMilesPerMonth: 800, wants: [],
  },
];

export const customerById = (id: string): Customer | undefined => CUSTOMERS.find((c) => c.id === id);

// The monthly payment each customer is making today, computed from the contract (not typed in).
export function currentPayment(c: Customer, loanPaymentFn: (p: number, apr: number, n: number) => number): number {
  const k = c.contract;
  return k.kind === 'loan' ? loanPaymentFn(k.amountFinanced, k.apr, k.termMonths)
    : leasePayment(k.capCost, k.residual, k.termMonths, k.moneyFactor);
}
