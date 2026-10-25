// Turns a customer's numbers into options, a recommendation and a timeline. Pure code, no AI.
// Rules are simple on purpose so each recommendation can be explained from the numbers shown.
import {
  addMonths, balanceAfter, interestToPayoff, leasePayment, loanPayment, monthsBetween, monthsToPayoff, round0,
} from './money.ts';
import { VALUE_ASSUMPTION, carValue, fuelPerMonth } from './vehicle.ts';
import { ASSUMPTIONS, CATALOG, currentPayment, type Customer, type LeaseContract, type LoanContract } from './customers.ts';

export interface Scenario { extraMilesPerMonth: number; extraPayment: number; pace?: number } // pace: miles a month to use instead of the lifetime average
export const NO_SCENARIO: Scenario = { extraMilesPerMonth: 0, extraPayment: 0 };

export interface Option {
  id: string; label: string;
  upfront: number;          // dollars due up front (fees, down payment)
  monthly: number;          // monthly payment after this choice (0 if none)
  months: number | null;    // how many monthly payments, null if not applicable
  extraCost: number | null; // extra interest or fees versus the simplest alternative, null if not applicable
  fuelPerMonth: number | null;
  tradeoff: string;         // one plain sentence
}
export interface NextStep { label: string; kind: 'self-service' | 'follow-up' | 'offer' }
export interface Advice {
  customerId: string; today: string;
  facts: Record<string, number | string>;  // the only numbers an explanation is allowed to use
  options: Option[]; recommendedId: string; reason: string; nextStep: NextStep;
  assumptions: string[]; valueNote: string;
}

const monthOf = (todayIso: string): string => todayIso.slice(0, 7);
const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

function loanFacts(c: Customer, k: LoanContract, today: string) {
  const elapsed = monthsBetween(k.startMonth, monthOf(today));
  const payment = loanPayment(k.amountFinanced, k.apr, k.termMonths);
  const remaining = Math.max(0, k.termMonths - elapsed);
  const balance = balanceAfter(k.amountFinanced, k.apr, payment, elapsed);
  const value = carValue({ msrp: c.vehicle.msrp, ageMonths: elapsed, miles: c.milesNow });
  return { elapsed, payment, remaining, balance, value, equity: value - balance };
}

function loanAdvice(c: Customer, k: LoanContract, today: string, s: Scenario): Advice {
  const f = loanFacts(c, k, today);
  const options: Option[] = [];
  options.push({
    id: 'keep', label: 'Keep it and keep paying', upfront: 0, monthly: f.payment, months: f.remaining, extraCost: 0, fuelPerMonth: null,
    tradeoff: f.remaining > 0 ? `You are payment-free in ${f.remaining} months.` : 'Your loan is paid off.',
  });
  const extra = s.extraPayment > 0 ? s.extraPayment : ASSUMPTIONS.extraPaymentDefault;
  const fasterMonths = monthsToPayoff(f.balance, k.apr, f.payment + extra);
  if (fasterMonths !== null && f.remaining > 1) {
    const saved = interestToPayoff(f.balance, k.apr, f.payment) - interestToPayoff(f.balance, k.apr, f.payment + extra);
    options.push({
      id: 'extra', label: `Pay ${usd(extra)} more a month`, upfront: 0, monthly: f.payment + extra, months: fasterMonths, extraCost: -saved, fuelPerMonth: null,
      tradeoff: `You finish ${f.remaining - fasterMonths} months sooner and save about ${usd(saved)} in interest.`,
    });
  }
  if (c.situation === 'hardship') {
    for (const more of [12, 24]) {
      const months = f.remaining + more;
      const pay = loanPayment(f.balance, k.apr, months);
      const extraInterest = pay * months - f.payment * f.remaining;
      options.push({
        id: `extend-${more}`, label: `Extend the loan by ${more} months`, upfront: 0, monthly: pay, months, extraCost: extraInterest, fuelPerMonth: null,
        tradeoff: `Your payment drops by ${usd(f.payment - pay)} a month and you pay about ${usd(extraInterest)} more in interest overall.`,
      });
    }
  }
  for (const id of c.wants) {
    const item = CATALOG[id];
    const apr = item.used ? ASSUMPTIONS.usedLoanApr : ASSUMPTIONS.newLoanApr;
    const financed = item.msrp - f.equity; // positive equity lowers it, negative equity is rolled in
    const pay = loanPayment(financed, apr, ASSUMPTIONS.newLoanMonths);
    options.push({
      id: `trade-${id}`, label: `Trade in for a ${item.label}`, upfront: 0, monthly: pay, months: ASSUMPTIONS.newLoanMonths,
      extraCost: null, fuelPerMonth: fuelPerMonth(c.milesNow / Math.max(1, f.elapsed), item.mpg, ASSUMPTIONS.gasPrice),
      tradeoff: f.equity >= 0
        ? `Your car covers ${usd(f.equity)} of the price, so you finance ${usd(financed)}.`
        : `You owe ${usd(-f.equity)} more than the car is worth, which gets added to the new loan.`,
    });
  }

  let recommendedId = 'keep'; let reason = ''; let nextStep: NextStep = { label: 'Set a reminder for my last payment', kind: 'follow-up' };
  if (c.situation === 'hardship') {
    const o = options.find((x) => x.id === 'extend-12')!;
    recommendedId = 'extend-12';
    reason = `Extending by 12 months lowers the payment from ${usd(f.payment)} to ${usd(o.monthly)}. Income is ${usd(c.monthlyIncome)} a month.`;
    nextStep = { label: 'Request a payment review', kind: 'self-service' };
  } else if (c.situation === 'growing-family') {
    const trades = options.filter((x) => x.id.startsWith('trade-')).sort((a, b) => a.monthly - b.monthly);
    recommendedId = trades[0].id;
    reason = `It has the lowest monthly payment (${usd(trades[0].monthly)}) of the ${trades.length} options you are considering, using your ${usd(f.equity)} of equity.`;
    nextStep = { label: 'Get my trade-in quote', kind: 'offer' };
  } else if (f.remaining <= 12) {
    reason = `You are ${f.remaining} payments from owning the car outright, and trading now would start a new ${ASSUMPTIONS.newLoanMonths}-month loan.`;
  } else {
    reason = 'Nothing about your situation makes a change clearly cheaper than keeping the loan.';
  }

  return {
    customerId: c.id, today,
    facts: {
      payment: round0(f.payment), balance: round0(f.balance), paymentsLeft: f.remaining, estimatedValue: round0(f.value),
      equity: round0(f.equity), monthlyIncome: c.monthlyIncome,
    },
    options, recommendedId, reason, nextStep,
    assumptions: [
      VALUE_ASSUMPTION,
      `New loans assume ${(ASSUMPTIONS.newLoanApr * 100).toFixed(1)}% APR (${(ASSUMPTIONS.usedLoanApr * 100).toFixed(1)}% for used) over ${ASSUMPTIONS.newLoanMonths} months.`,
      'Figures are estimates for a synthetic customer, not an offer.',
    ],
    valueNote: c.situation === 'hardship'
      ? 'Early, self-service help can prevent a missed payment and a service call.'
      : c.situation === 'growing-family' ? 'A qualified trade-in and financing lead for the dealer.'
        : 'Keeps a loyal customer in the Toyota family at payoff instead of losing them.',
  };
}

function leaseFacts(c: Customer, k: LeaseContract, today: string, s: Scenario) {
  const elapsed = monthsBetween(k.startMonth, monthOf(today));
  const monthsLeft = Math.max(0, k.termMonths - elapsed);
  const perMonth = s.pace ?? c.milesNow / Math.max(1, elapsed);
  const projected = c.milesNow + (perMonth + s.extraMilesPerMonth) * monthsLeft;
  const overMiles = Math.max(0, projected - k.allowedMiles);
  const overageCost = overMiles * k.overageFee;
  const valueAtEnd = carValue({ msrp: c.vehicle.msrp, ageMonths: k.termMonths, miles: projected });
  const price = k.residual + ASSUMPTIONS.buyoutFee; // what buying actually costs, fee included
  return { elapsed, monthsLeft, perMonth, projected, overMiles, overageCost, valueAtEnd, price, equity: valueAtEnd - price };
}

function leaseAdvice(c: Customer, k: LeaseContract, today: string, s: Scenario): Advice {
  const f = leaseFacts(c, k, today, s);
  const fees = f.overageCost + k.dispositionFee;
  const options: Option[] = [];
  options.push({
    id: 'return', label: 'Return the car', upfront: fees, monthly: 0, months: null, extraCost: fees, fuelPerMonth: null,
    tradeoff: `${f.overMiles > 0 ? `${usd(f.overageCost)} for ${round0(f.overMiles).toLocaleString('en-US')} extra miles plus ` : ''}a ${usd(k.dispositionFee)} return fee. You will need another car.`,
  });
  const price = f.price;
  const buyPay = loanPayment(price, k.buyoutApr, ASSUMPTIONS.buyoutMonths);
  const nowPay = leasePayment(k.capCost, k.residual, k.termMonths, k.moneyFactor);
  options.push({
    id: 'buyout', label: 'Buy the car', upfront: 0, monthly: buyPay, months: ASSUMPTIONS.buyoutMonths, extraCost: Math.max(0, -f.equity), fuelPerMonth: null,
    tradeoff: f.equity >= 0
      ? `You would pay ${usd(price)} (fee included) for a car estimated at ${usd(f.valueAtEnd)}, about ${usd(f.equity)} less than it is worth.`
      : `You would pay ${usd(price)} (fee included) for a car estimated at ${usd(f.valueAtEnd)}, about ${usd(-f.equity)} more than it is worth.`,
  });
  for (const id of c.wants) {
    const item = CATALOG[id];
    const lease = leasePayment(item.msrp, item.msrp * (item.leaseResidualPct ?? 0.6), k.termMonths, ASSUMPTIONS.promoMoneyFactor);
    const fuelNow = fuelPerMonth(f.perMonth, c.vehicle.mpg, ASSUMPTIONS.gasPrice);
    const fuelNew = fuelPerMonth(f.perMonth, item.mpg, ASSUMPTIONS.gasPrice);
    options.push({
      id: `replace-${id}`, label: `Lease a new ${item.label}`, upfront: fees, monthly: lease, months: k.termMonths, extraCost: fees, fuelPerMonth: fuelNew,
      tradeoff: `About ${usd(lease)} a month (${lease >= nowPay ? `${usd(lease - nowPay)} more` : `${usd(nowPay - lease)} less`} than now) and ${usd(fuelNow - fuelNew)} less in fuel each month at your driving. Fees on the old lease still apply.`,
    });
  }

  let recommendedId = 'return'; let reason = ''; let nextStep: NextStep = { label: 'Schedule my return inspection', kind: 'self-service' };
  const replace = options.find((o) => o.id.startsWith('replace-'));
  if (f.equity >= 1000) {
    recommendedId = 'buyout';
    reason = `The car is estimated at ${usd(f.valueAtEnd)} and buying costs ${usd(f.price)} (the ${usd(k.residual)} buyout price plus a ${usd(ASSUMPTIONS.buyoutFee)} fee), so buying leaves about ${usd(f.equity)} of value.`;
    nextStep = { label: 'Check my buyout offer', kind: 'offer' };
  } else if (replace && f.overMiles > 0 && f.perMonth > 1000) {
    recommendedId = replace.id;
    reason = `You are heading about ${round0(f.overMiles).toLocaleString('en-US')} miles over and drive ${round0(f.perMonth).toLocaleString('en-US')} miles a month, so better fuel economy adds up. Buying costs more than the car is estimated to be worth.`;
    nextStep = { label: `See my ${CATALOG[c.wants[0]].label} offer`, kind: 'offer' };
  } else {
    reason = 'Returning is the simplest move: the buyout is not a bargain and your mileage is fine.';
  }

  return {
    customerId: c.id, today,
    facts: {
      monthsLeft: f.monthsLeft, milesPerMonth: round0(f.perMonth), projectedMiles: round0(f.projected), allowedMiles: k.allowedMiles,
      overMiles: round0(f.overMiles), overageCost: round0(f.overageCost), returnFees: round0(fees), estimatedValueAtEnd: round0(f.valueAtEnd),
      buyoutPrice: k.residual, totalToBuy: round0(f.price), equity: round0(f.equity), currentPayment: round0(nowPay),
      paceBasis: s.pace === undefined ? 'lifetime average' : 'last 8 weeks',
    },
    options, recommendedId, reason, nextStep,
    assumptions: [
      VALUE_ASSUMPTION,
      `Buying assumes a ${usd(ASSUMPTIONS.buyoutFee)} fee, financed at ${(k.buyoutApr * 100).toFixed(1)}% for ${ASSUMPTIONS.buyoutMonths} months.`,
      `New leases assume a promotional money factor of ${ASSUMPTIONS.promoMoneyFactor}. Fuel assumes $${ASSUMPTIONS.gasPrice.toFixed(2)} a gallon.`,
      'Figures are estimates for a synthetic customer, not an offer.',
    ],
    valueNote: f.equity >= 1000
      ? 'Keeps the vehicle in Toyota financing instead of losing it at return.'
      : 'Keeps a customer who might otherwise leave at lease end.',
  };
}

export function advise(c: Customer, today: string, s: Scenario = NO_SCENARIO): Advice {
  return c.contract.kind === 'loan' ? loanAdvice(c, c.contract, today, s) : leaseAdvice(c, c.contract, today, s);
}

// ---- Timeline: balance (or buyout price) against estimated value, month by month ----
export interface TimelinePoint { month: string; value: number; owed: number; equity: number; miles: number }
export interface Timeline {
  customerId: string; points: TimelinePoint[]; nowMonth: string; nowIndex: number; endMonth: string;
  crossoverMonth: string | null; crossedAlready: boolean; owedLabel: string;
}

export function timeline(c: Customer, today: string, s: Scenario = NO_SCENARIO): Timeline {
  const k = c.contract;
  const nowMonth = monthOf(today);
  const elapsed = monthsBetween(k.startMonth, nowMonth);
  const horizon = Math.max(k.termMonths, elapsed) + 12;
  const avgPace = c.milesNow / Math.max(1, elapsed);
  const perMonth = avgPace;
  const futurePace = s.pace ?? avgPace;
  const payment = k.kind === 'loan' ? currentPayment(c, loanPayment) : 0;
  const points: TimelinePoint[] = [];
  let owed = k.kind === 'loan' ? k.amountFinanced : k.residual;
  for (let m = 0; m <= horizon; m++) {
    const miles = m <= elapsed ? perMonth * m : c.milesNow + (futurePace + s.extraMilesPerMonth) * (m - elapsed);
    if (k.kind === 'loan') {
      if (m <= elapsed) owed = balanceAfter(k.amountFinanced, k.apr, payment, m);
      else {
        owed = Math.max(0, owed * (1 + k.apr / 12) - (payment + s.extraPayment));
      }
    }
    const value = carValue({ msrp: c.vehicle.msrp, ageMonths: m, miles });
    points.push({ month: addMonths(k.startMonth, m), value: round0(value), owed: round0(owed), equity: round0(value - owed), miles: round0(miles) });
  }
  // First month from which equity stays at or above zero.
  let crossIdx: number | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].equity >= 0) crossIdx = i; else break;
  }
  return {
    customerId: c.id, points, nowMonth, nowIndex: elapsed,
    endMonth: addMonths(k.startMonth, k.termMonths),
    crossoverMonth: crossIdx === null ? null : points[crossIdx].month,
    crossedAlready: crossIdx !== null && crossIdx <= elapsed,
    owedLabel: k.kind === 'loan' ? 'Loan balance' : 'Buyout price',
  };
}
