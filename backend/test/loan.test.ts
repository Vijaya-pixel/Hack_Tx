import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { percentPaid, addMonths, biweekly, compare, monthlyPayment, payoff, roundMoney, roundUp } from '../src/loan.ts';

const close = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

describe('roundUp', () => {
  test('rounds to the next dollar', () => {
    assert.equal(roundUp(420), 80);
    assert.equal(roundUp(101), 99);
    assert.equal(roundUp(199), 1);
  });
  test('an exact dollar gives 0', () => {
    assert.equal(roundUp(500), 0);
    assert.equal(roundUp(0), 0);
  });
  test('rejects bad input', () => {
    assert.throws(() => roundUp(-1));
    assert.throws(() => roundUp(1.5));
  });
});

describe('monthlyPayment', () => {
  test("Alex's payment is about $656", () => {
    close(monthlyPayment(28000, 5.9, 48), 656, 1);
  });
  test('0% APR is balance / months', () => {
    assert.equal(monthlyPayment(4800, 0, 48), 100);
  });
});

describe('payoff', () => {
  const pay = monthlyPayment(28000, 5.9, 48);
  test('the computed payment pays off in 48 months with the schedule ending at 0', () => {
    const p = payoff(28000, 5.9, pay);
    assert.equal(p.months, 48);
    assert.equal(p.schedule.length, 49);
    assert.equal(p.schedule[48].balance, 0);
    close(p.totalPaid, p.totalInterest + 28000, 0.001);
  });
  test('zero extra equals the standard schedule; extra saves time and interest', () => {
    const base = payoff(28000, 5.9, pay, 0);
    const more = payoff(28000, 5.9, pay, 25);
    assert.ok(more.months < base.months);
    assert.ok(more.totalInterest < base.totalInterest);
  });
  test('a huge extra pays off in a month or two', () => {
    const p = payoff(28000, 5.9, pay, 10000);
    assert.ok(p.months <= 2);
    assert.equal(p.schedule.at(-1)!.balance, 0);
  });
  test('0% APR has no interest', () => {
    const p = payoff(4800, 0, 100, 0);
    assert.equal(p.months, 48);
    assert.equal(p.totalInterest, 0);
    assert.equal(payoff(4800, 0, 100, 25).months < 48, true);
  });
  test('a payment below the interest is rejected', () => {
    assert.throws(() => payoff(28000, 5.9, 50), /interest/);
  });
});

describe('compare and biweekly', () => {
  const pay = monthlyPayment(28000, 5.9, 48);
  test('compare reports months, interest and payoff dates', () => {
    const c = compare(payoff(28000, 5.9, pay), payoff(28000, 5.9, pay, 20), new Date('2026-10-24T00:00:00Z'));
    assert.ok(c.monthsSaved > 0 && c.interestSaved > 0);
    assert.equal(c.standard.payoffDate, '2030-10');
    assert.ok(c.withRoundUps.payoffDate < c.standard.payoffDate);
  });
  test('zero extra saves nothing', () => {
    const c = compare(payoff(28000, 5.9, pay), payoff(28000, 5.9, pay, 0));
    assert.equal(c.monthsSaved, 0);
    assert.equal(c.interestSaved, 0);
  });
  test('bi-weekly saves a few months of a 48-month loan', () => {
    const b = biweekly(28000, 5.9, pay);
    assert.ok(b.monthsSaved >= 2 && b.monthsSaved <= 5, String(b.monthsSaved));
    assert.ok(b.interestSaved > 0);
  });
  test('helpers', () => {
    assert.equal(roundMoney(1.005 * 100) / 100 > 0, true);
    assert.equal(addMonths(new Date('2026-12-15T00:00:00Z'), 2), '2027-02');
  });
});

describe('percentPaid', () => {
  test('share of the original loan paid, one decimal, clamped', () => {
    assert.equal(percentPaid(35000, 28000), 20);
    assert.equal(percentPaid(35000, 0), 100);
    assert.equal(percentPaid(30000, 31000), 0);
    assert.equal(percentPaid(3, 2), 33.3);
    assert.throws(() => percentPaid(0, 0));
  });
});
