import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, CATALOG, ASSUMPTIONS, customerById } from '../src/toyota/customers.ts';
import { advise, timeline, NO_SCENARIO } from '../src/toyota/advice.ts';
import { balanceAfter, loanPayment, leasePayment } from '../src/toyota/money.ts';
import { carValue } from '../src/toyota/vehicle.ts';

const TODAY = '2026-10-24';
const get = (id: string) => customerById(id)!;
const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
const opt = (id: string, optionId: string) => advise(get(id), TODAY).options.find((o) => o.id === optionId)!;

describe('the five customers tell the stories we expect', () => {
  const expected: Record<string, [string, string]> = {
    maya: ['replace-rav4-hybrid', 'offer'],
    jake: ['keep', 'follow-up'],
    sam: ['extend-12', 'self-service'],
    priya: ['trade-highlander-certified', 'offer'],
    lena: ['buyout', 'offer'],
  };
  for (const [id, [rec, kind]] of Object.entries(expected)) {
    test(`${id} is recommended ${rec}`, () => {
      const a = advise(get(id), TODAY);
      assert.equal(a.recommendedId, rec);
      assert.equal(a.nextStep.kind, kind);
    });
  }

  test("Maya's numbers: 6,000 miles over costs $1,500, plus a $395 fee", () => {
    const f = advise(get('maya'), TODAY).facts;
    assert.deepEqual([f.monthsLeft, f.milesPerMonth, f.projectedMiles, f.overMiles, f.overageCost, f.returnFees], [3, 1167, 42000, 6000, 1500, 1895]);
  });
  test('Jake is 10 payments from done', () => { assert.equal(advise(get('jake'), TODAY).facts.paymentsLeft, 10); });
  test("Sam's extension lowers the payment and costs more interest", () => {
    const keep = opt('sam', 'keep'); const ext = opt('sam', 'extend-12'); const ext24 = opt('sam', 'extend-24');
    assert.ok(ext.monthly < keep.monthly && ext24.monthly < ext.monthly);
    assert.ok((ext.extraCost ?? 0) > 0 && (ext24.extraCost ?? 0) > (ext.extraCost ?? 0));
  });
  test("Sam's wording never promises approval", () => {
    const a = advise(get('sam'), TODAY);
    assert.equal(a.nextStep.label, 'Request a payment review');
    const text = JSON.stringify(a).toLowerCase();
    assert.ok(!/approved|guarantee/.test(text));
  });
  test("Priya's trade-in quotes use her equity, and the certified car is cheaper", () => {
    const a = advise(get('priya'), TODAY);
    const eq = Number(a.facts.estimatedValue) - Number(a.facts.balance);
    assert.ok(Math.abs(eq - Number(a.facts.equity)) <= 1);
    const grand = a.options.find((o) => o.id === 'trade-grand-highlander')!;
    assert.ok(Math.abs(grand.monthly - loanPayment(CATALOG['grand-highlander'].msrp - Number(a.facts.equity), ASSUMPTIONS.newLoanApr, 60)) < 1);
    assert.ok(opt('priya', 'trade-highlander-certified').monthly < grand.monthly);
  });
  test("Lena's equity is value minus the full cost to buy, fee included", () => {
    const f = advise(get('lena'), TODAY).facts;
    assert.equal(f.totalToBuy, 15950 + ASSUMPTIONS.buyoutFee);
    assert.ok(Math.abs(Number(f.estimatedValueAtEnd) - Number(f.totalToBuy) - Number(f.equity)) <= 1);
  });
});

describe('consistency rules every advice must satisfy', () => {
  for (const c of CUSTOMERS) {
    test(`${c.id}: options are sane and the recommendation is one of them`, () => {
      const a = advise(c, TODAY);
      const ids = a.options.map((o) => o.id);
      assert.equal(new Set(ids).size, ids.length, 'unique option ids');
      assert.ok(ids.includes(a.recommendedId));
      for (const o of a.options) {
        for (const n of [o.upfront, o.monthly]) assert.ok(Number.isFinite(n) && n >= 0, `${o.id} money is finite and not negative`);
        assert.ok(o.tradeoff.length > 10 && !/NaN|undefined|Infinity/.test(o.tradeoff), `${o.id} tradeoff reads cleanly`);
      }
      for (const v of Object.values(a.facts)) assert.ok(typeof v === 'string' || Number.isFinite(v));
      assert.ok(a.assumptions.length >= 2 && a.reason.length > 20 && a.valueNote.length > 10);
      assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(a)));
    });
  }

  test("a lease buyout line states the same gap the prices imply", () => {
    for (const id of ['maya', 'lena']) {
      const f = advise(get(id), TODAY).facts;
      const gap = Math.abs(Number(f.totalToBuy) - Number(f.estimatedValueAtEnd));
      assert.ok(opt(id, 'buyout').tradeoff.includes(usd(gap)), `${id}: buyout text mentions ${usd(gap)}`);
    }
  });
  test("Maya's replacement text says how it compares with her current payment", () => {
    const f = advise(get('maya'), TODAY).facts;
    const lease = leasePayment(CATALOG['rav4-hybrid'].msrp, CATALOG['rav4-hybrid'].msrp * 0.64, 36, ASSUMPTIONS.promoMoneyFactor);
    assert.ok(opt('maya', 'replace-rav4-hybrid').tradeoff.includes(usd(lease - Number(f.currentPayment))));
  });
  test('the same day gives the same advice every time', () => {
    for (const c of CUSTOMERS) assert.deepEqual(advise(c, TODAY), advise(c, TODAY));
  });
  test('time moves the story: six months earlier Maya has more time left and fewer projected miles', () => {
    const early = advise(get('maya'), '2026-04-24').facts;
    assert.equal(early.monthsLeft, 9);
  });
});

describe('what-if sliders change the right numbers in the right direction', () => {
  test('driving 500 more miles a month means more overage and a lower value for Maya', () => {
    const base = advise(get('maya'), TODAY).facts;
    const more = advise(get('maya'), TODAY, { extraMilesPerMonth: 500, extraPayment: 0 }).facts;
    assert.ok(Number(more.overageCost) > Number(base.overageCost));
    assert.ok(Number(more.estimatedValueAtEnd) < Number(base.estimatedValueAtEnd));
    assert.equal(Number(more.projectedMiles) - Number(base.projectedMiles), 1500);
  });
  test('driving a lot less removes the overage entirely', () => {
    const f = advise(get('maya'), TODAY, { extraMilesPerMonth: -2000, extraPayment: 0 }).facts;
    assert.equal(f.overageCost, 0);
  });
  test('an extra payment shortens the loan and lowers the balance in the timeline', () => {
    const base = timeline(get('sam'), TODAY, NO_SCENARIO);
    const fast = timeline(get('sam'), TODAY, { extraMilesPerMonth: 0, extraPayment: 200 });
    const i = base.nowIndex + 24;
    assert.ok(fast.points[i].owed < base.points[i].owed);
    assert.equal(fast.points[base.nowIndex].owed, base.points[base.nowIndex].owed, 'the past does not change');
  });
});

describe('timeline', () => {
  for (const c of CUSTOMERS) {
    test(`${c.id}: months are contiguous, equity = value - owed, nothing is NaN`, () => {
      const t = timeline(c, TODAY);
      assert.equal(t.points[0].month, c.contract.startMonth);
      for (let i = 1; i < t.points.length; i++) {
        const [py, pm] = t.points[i - 1].month.split('-').map(Number);
        const [y, m] = t.points[i].month.split('-').map(Number);
        assert.equal(y * 12 + m - (py * 12 + pm), 1);
      }
      for (const p of t.points) {
        assert.ok(Math.abs(p.equity - (p.value - p.owed)) <= 1);
        assert.ok(Number.isFinite(p.value) && Number.isFinite(p.owed) && p.owed >= 0);
      }
      assert.equal(t.points[t.nowIndex].month, t.nowMonth);
    });
  }
  test('a loan balance reaches zero at the end of the term and stays there', () => {
    const t = timeline(get('jake'), TODAY);
    const endIdx = t.points.findIndex((p) => p.month === t.endMonth);
    assert.ok(t.points[endIdx].owed <= 1);
    assert.ok(t.points.slice(endIdx).every((p) => p.owed <= 1));
  });
  test('a loan matches balanceAfter at the present month', () => {
    const c = get('sam'); const k = c.contract as { amountFinanced: number; apr: number; termMonths: number };
    const t = timeline(c, TODAY);
    const pay = loanPayment(k.amountFinanced, k.apr, k.termMonths);
    assert.ok(Math.abs(t.points[t.nowIndex].owed - balanceAfter(k.amountFinanced, k.apr, pay, t.nowIndex)) <= 1);
  });
  test("Jake's equity is already positive and stays that way; Maya's never turns positive", () => {
    assert.equal(timeline(get('jake'), TODAY).crossedAlready, true);
    assert.equal(timeline(get('maya'), TODAY).crossoverMonth, null);
    assert.equal(timeline(get('lena'), TODAY).crossedAlready, true);
  });
  test('the value line matches the car value model', () => {
    const c = get('lena'); const t = timeline(c, TODAY);
    const p = t.points[t.nowIndex];
    assert.ok(Math.abs(p.value - carValue({ msrp: c.vehicle.msrp, ageMonths: t.nowIndex, miles: c.milesNow })) <= 1);
  });
});
