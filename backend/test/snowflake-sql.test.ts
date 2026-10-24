import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_SQL, PLAN_BINDS } from '../src/snowflake.ts';

test('plan query bind order matches the placeholders in the SQL', () => {
  const parts = PLAN_SQL.split('?');
  assert.equal(parts.length - 1, 6, 'six placeholders');
  const binds = PLAN_BINDS({ code: 'CODE', nights: 3, today: '2026-10-24' });
  assert.deepEqual(binds, ['CODE', 'CODE', '2026-10-24', 3, '2026-10-24', '2026-10-24']);
  // what sits right before each placeholder tells us what it must be
  assert.match(parts[0], /GROUP_CODE = $/);
  assert.match(parts[1], /GROUP_CODE = $/);
  assert.match(parts[2], /DATEDIFF\(day, TO_DATE\($/, 'third is today (lead days)');
  assert.match(parts[3], /SURVIVAL_SCORE\(\(SELECT C FROM n\), $/, 'fourth is nights');
  assert.match(parts[4], /DATEDIFF\(day, TO_DATE\($/, 'fifth is today');
  assert.match(parts[5], /WHERE DATEDIFF\(day, TO_DATE\($/, 'sixth is today');
});
