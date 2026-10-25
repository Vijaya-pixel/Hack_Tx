import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loanPayment, balanceAfter, monthsToPayoff, interestToPayoff, leasePayment, monthsBetween, addMonths, round2,
} from '../src/toyota/money.ts';
import { carValue, fuelPerMonth } from '../src/toyota/vehicle.ts';

const close = (a: number, b: number, tol = 0.01): void => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

describe('loans', () => {
  test('known payment: $20,000 at 6% for 60 months is $386.66', () => {
    close(loanPayment(20000, 0.06, 60), 386.66);
  });
  test('zero interest is just principal divided by months', () => {
    assert.equal(loanPayment(12000, 0, 24), 500);
  });
  test('paying the scheduled payment for every month ends at zero', () => {
    const p = loanPayment(24000, 0.069, 72);
    close(balanceAfter(24000, 0.069, p, 72), 0, 0.05);
    close(balanceAfter(24000, 0.069, p, 0), 24000);
  });
  test('the balance only goes down and ends above zero until the last payment', () => {
    const p = loanPayment(19000, 0.049, 60);
    let last = 19000;
    for (let k = 1; k < 60; k++) {
      const b = balanceAfter(19000, 0.049, p, k);
      assert.ok(b < last && b > 0, `month ${k}`);
      last = b;
    }
  });
  test('months to payoff matches the term, and extra payments shorten it', () => {
    const p = loanPayment(15000, 0.07, 48);
    assert.equal(monthsToPayoff(15000, 0.07, p), 48);
    const faster = monthsToPayoff(15000, 0.07, p + 100);
    assert.ok(faster !== null && faster < 48);
    assert.ok(interestToPayoff(15000, 0.07, p + 100) < interestToPayoff(15000, 0.07, p));
  });
  test('a payment that cannot cover the interest never pays off', () => {
    assert.equal(monthsToPayoff(10000, 0.12, 50), null);
    assert.equal(interestToPayoff(10000, 0.12, 50), Infinity);
  });
  test('total interest equals total paid minus principal', () => {
    const p = loanPayment(10000, 0.08, 36);
    close(interestToPayoff(10000, 0.08, p), p * 36 - 10000, 0.5);
  });
  test('bad input is rejected', () => { assert.throws(() => loanPayment(1000, 0.05, 0)); });
});

describe('leases and dates', () => {
  test('lease payment: depreciation plus finance charge', () => {
    // (30000-18000)/36 = 333.33; (30000+18000)*0.0015 = 72
    close(leasePayment(30000, 18000, 36, 0.0015), 405.33);
  });
  test('month arithmetic', () => {
    assert.equal(monthsBetween('2024-01', '2026-10'), 33);
    assert.equal(addMonths('2026-10', 3), '2027-01');
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(round2(1.005 + 0.0001), 1.01);
  });
});

describe('car value model', () => {
  test('starts at sticker price and falls with age', () => {
    close(carValue({ msrp: 30000, ageMonths: 0, miles: 0 }), 30000);
    assert.ok(carValue({ msrp: 30000, ageMonths: 12, miles: 12000 }) < carValue({ msrp: 30000, ageMonths: 6, miles: 6000 }));
    close(carValue({ msrp: 30000, ageMonths: 12, miles: 12000 }), 24000);
    close(carValue({ msrp: 30000, ageMonths: 24, miles: 24000 }), 21120);
  });
  test('extra miles lower the value and low miles raise it (up to a cap)', () => {
    const base = carValue({ msrp: 30000, ageMonths: 36, miles: 36000 });
    assert.ok(carValue({ msrp: 30000, ageMonths: 36, miles: 46000 }) < base);
    close(base - carValue({ msrp: 30000, ageMonths: 36, miles: 46000 }), 800);
    close(carValue({ msrp: 30000, ageMonths: 36, miles: 0 }) - base, 1500);
  });
  test('never worth less than $1,500', () => {
    assert.equal(carValue({ msrp: 10000, ageMonths: 400, miles: 900000 }), 1500);
  });
  test('fuel cost', () => { close(fuelPerMonth(1000, 25, 3.5), 140); });
});
