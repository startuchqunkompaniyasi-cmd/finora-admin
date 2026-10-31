import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachDayKeys, weeklySeries, weekStatistics, monthSeries, monthStatistics, yearStatistics, availableYears, elapsedDays } from '../../shared/stats.js';
import { daysBetween, previousMonthStart } from '../../shared/dates.js';

const tz = 'Asia/Tashkent';
const tx = (id, type, major, categoryId, iso, extra = {}) => ({ id, type, amount: major * 100, currency: 'UZS', categoryId, occurredAt: iso, ...extra });

// Thu 17 Sep 2026 is "today". Week = Mon 14 .. Sun 20.
const TODAY = '2026-09-17';
const data = attachDayKeys(
  [
    tx('1', 'income', 200_000, 'business', '2026-09-14T05:00:00Z'), // Mon
    tx('2', 'expense', 80_000, 'food', '2026-09-14T09:00:00Z'), // Mon
    tx('3', 'expense', 120_000, 'food', '2026-09-15T09:00:00Z'), // Tue
    tx('4', 'income', 500_000, 'salary', '2026-09-16T05:00:00Z'), // Wed
    tx('5', 'expense', 70_000, 'transport', '2026-09-16T09:00:00Z'), // Wed
    tx('6', 'expense', 900_000, 'shopping', '2026-08-30T09:00:00Z'), // August
    tx('7', 'income', 100, 'business', '2025-12-31T05:00:00Z', { currency: 'USD', fxRateToBase: 12_000 }), // 2025, $100
  ],
  tz
);

test('daysBetween / previousMonthStart / elapsedDays', () => {
  assert.equal(daysBetween('2026-09-14', '2026-09-20'), 6);
  assert.equal(previousMonthStart('2026-01-15'), '2025-12-01');
  assert.equal(previousMonthStart('2026-09-17'), '2026-08-01');
  assert.equal(elapsedDays('2026-09-14', '2026-09-20', TODAY), 4, 'Mon..Thu');
  assert.equal(elapsedDays('2026-09-14', '2026-09-20', '2026-09-30'), 7, 'past week is complete');
  assert.equal(elapsedDays('2026-10-01', '2026-10-31', TODAY), 0, 'future month has no elapsed days');
});

test('weekStatistics divides by ELAPSED days and finds highest / lowest days', () => {
  const stats = weekStatistics(weeklySeries(data, TODAY, 'UZS'), TODAY);
  assert.equal(stats.income, 700_000 * 100);
  assert.equal(stats.expense, 270_000 * 100);
  assert.equal(stats.net, 430_000 * 100);
  assert.equal(stats.daysCounted, 4);
  assert.equal(stats.avgDailySpending, 6_750_000, '270,000 / 4 days, not / 7');
  assert.deepEqual(stats.highest, { dayKey: '2026-09-15', amount: 12_000_000 });
  assert.deepEqual(stats.lowest, { dayKey: '2026-09-17', amount: 0 }, 'Thursday (today) had no spending');
});

test('weekStatistics with no spending has no extremes', () => {
  const stats = weekStatistics(weeklySeries([], TODAY, 'UZS'), TODAY);
  assert.equal(stats.highest, null);
  assert.equal(stats.lowest, null);
  assert.equal(stats.avgDailySpending, 0);
});

test('monthSeries: 12 buckets, USD converted with the stored rate', () => {
  const sep = monthSeries(data, 2026, 'UZS');
  assert.equal(sep.length, 12);
  assert.equal(sep[8].income, 700_000 * 100);
  assert.equal(sep[7].expense, 900_000 * 100, 'August');
  assert.equal(sep[0].count, 0);
  assert.equal(monthSeries(data, 2025, 'UZS')[11].income, 1_200_000 * 100, '$100 x 12,000');
});

test('monthStatistics: averages, extremes, current vs finished month', () => {
  const sep = monthStatistics(data, 2026, 9, TODAY, 'UZS');
  assert.equal(sep.daysCounted, 17);
  assert.equal(sep.avgDailyExpense, Math.round((270_000 * 100) / 17));
  assert.equal(sep.largestExpense.amount, 120_000 * 100);
  assert.equal(sep.largestExpense.transaction.id, '3');
  assert.equal(sep.largestIncome.transaction.id, '4');
  const aug = monthStatistics(data, 2026, 8, TODAY, 'UZS');
  assert.equal(aug.daysCounted, 31, 'a finished month divides by its full length');
  assert.equal(monthStatistics(data, 2026, 2, TODAY, 'UZS').largestExpense, null);
});

test('yearStatistics: savings rate, best and top-spending month', () => {
  const stats = yearStatistics(monthSeries(data, 2026, 'UZS'));
  assert.equal(stats.income, 700_000 * 100);
  assert.equal(stats.expense, (270_000 + 900_000) * 100);
  assert.ok(stats.net < 0);
  assert.ok(stats.savingsRate < 0);
  assert.equal(stats.bestMonth.month, 9);
  assert.equal(stats.topSpendingMonth.month, 8);
  assert.equal(yearStatistics(monthSeries([], 2026, 'UZS')).savingsRate, null);
});

test('availableYears always includes the current year, newest first', () => {
  assert.deepEqual(availableYears(data, TODAY), [2026, 2025]);
  assert.deepEqual(availableYears([], TODAY), [2026]);
});
