import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoHistory, demoSnapshot } from '../../shared/exchangeDemo.js';

test('buildDemoHistory: qatʼiy (seeded), talab qilingan uzunlik va sanalar ketma-ketligi', () => {
  const a = buildDemoHistory('2026-09-20', 10);
  const b = buildDemoHistory('2026-09-20', 10);
  assert.deepEqual(a, b, 'bir xil chaqiriq bir xil natija berishi kerak');
  assert.equal(a.length, 10);
  assert.equal(a[0].date, '2026-09-11');
  assert.equal(a.at(-1).date, '2026-09-20');
  assert.ok(a.every((point) => point.rate > 0));
});

test('demoSnapshot: change/changePct izchil', () => {
  const snap = demoSnapshot('2026-09-20');
  assert.equal(snap.change, snap.rate - snap.previousRate);
  assert.ok(Math.abs(snap.changePct - snap.change / snap.previousRate) < 1e-9);
  assert.equal(snap.history.length, 365);
  assert.equal(snap.history.at(-1).rate, snap.rate);
});
