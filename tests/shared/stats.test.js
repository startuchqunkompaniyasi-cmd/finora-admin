import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachDayKeys, summarize, weeklySeries, categoryBreakdown, balanceSeries } from '../../shared/stats.js';

const tz = 'Asia/Tashkent';
const tx = (id, type, amount, categoryId, occurredAt, extra = {}) => ({
  id, type, amount: amount * 100, currency: 'UZS', categoryId, occurredAt, ...extra,
});

const data = attachDayKeys(
  [
    tx('1', 'income', 5_000_000, 'salary', '2026-09-14T05:00:00Z'), // Mon
    tx('2', 'expense', 80_000, 'food', '2026-09-14T09:00:00Z'), // Mon
    tx('3', 'expense', 120_000, 'food', '2026-09-15T09:00:00Z'), // Tue
    tx('4', 'expense', 70_000, 'transport', '2026-09-16T09:00:00Z'), // Wed
    tx('5', 'income', 250, 'business', '2026-09-16T10:00:00Z', { currency: 'USD', fxRateToBase: 12000 }), // Wed, $250
  ],
  tz
);

test('summarize totals in base currency', () => {
  const s = summarize(data, 'UZS');
  assert.equal(s.income, (5_000_000 + 3_000_000) * 100);
  assert.equal(s.expense, 270_000 * 100);
  assert.equal(s.net, s.income - s.expense);
  assert.ok(Math.abs(s.savingsRate - (s.net / s.income)) < 1e-12);
});

test('weeklySeries returns Monday..Sunday buckets', () => {
  const week = weeklySeries(data, '2026-09-20', 'UZS');
  assert.equal(week.length, 7);
  assert.equal(week[0].dayKey, '2026-09-14');
  assert.equal(week[0].expense, 80_000 * 100);
  assert.equal(week[2].income, 3_000_000 * 100);
  assert.equal(week[6].income + week[6].expense, 0);
});

test('categoryBreakdown sorts by total and computes shares', () => {
  const rows = categoryBreakdown(data, 'UZS', 'expense');
  assert.deepEqual(rows.map((r) => r.categoryId), ['food', 'transport']);
  assert.equal(rows[0].count, 2);
  assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.share, 0) - 1) < 1e-12);
});

test('balanceSeries is a running total and ends at the overall balance', () => {
  const series = balanceSeries(data, '2026-09-20', 7, 'UZS');
  assert.equal(series.length, 7);
  assert.equal(series.at(-1).balance, summarize(data, 'UZS').net);
  assert.equal(series[0].balance, (5_000_000 - 80_000) * 100);
});

test('balanceSeries includes the starting balance', () => {
  const series = balanceSeries(data, '2026-09-20', 7, 'UZS', 1_000_000 * 100);
  assert.equal(series.at(-1).balance, summarize(data, 'UZS').net + 1_000_000 * 100);
});
