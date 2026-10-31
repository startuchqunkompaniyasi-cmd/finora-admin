import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachDayKeys } from '../../shared/stats.js';
import { generateInsights } from '../../shared/insights.js';

const tz = 'Asia/Tashkent';
let n = 0;
const tx = (type, major, categoryId, day, extra = {}) => ({ id: `t${(n += 1)}`, type, amount: major * 100, currency: 'UZS', categoryId, occurredAt: `${day}T07:00:00Z`, ...extra });
const build = (list) => attachDayKeys(list, tz);
const find = (insights, type) => insights.find((i) => i.type === type);

// Thursday 17 Sep 2026
const TODAY = '2026-09-17';
const run = (list, limit = 20) => generateInsights({ transactions: build(list), today: TODAY, baseCurrency: 'UZS', limit });

test('no data -> no insights', () => {
  assert.deepEqual(run([]), []);
});

test('top category this week', () => {
  const insights = run([tx('expense', 420_000, 'food', '2026-09-15'), tx('expense', 80_000, 'transport', '2026-09-16')]);
  const top = find(insights, 'top-category-week');
  assert.equal(top.categoryId, 'food');
  assert.equal(top.amount, 42_000_000);
  assert.ok(Math.abs(top.share - 0.84) < 1e-9);
});

test('same-days comparison: this week Mon..Thu vs last week Mon..Thu, never the full last week', () => {
  const insights = run([
    // this week Mon..Thu: transport 112,000 / food 100,000
    tx('expense', 112_000, 'transport', '2026-09-15'),
    tx('expense', 100_000, 'food', '2026-09-16'),
    // last week Mon..Thu: transport 100,000 / food 100,000
    tx('expense', 100_000, 'transport', '2026-09-08'),
    tx('expense', 100_000, 'food', '2026-09-09'),
    // last week Fri..Sun MUST be ignored
    tx('expense', 5_000_000, 'shopping', '2026-09-11'),
  ]);
  const change = find(insights, 'category-change-week');
  assert.equal(change.categoryId, 'transport');
  assert.ok(Math.abs(change.ratio - 0.12) < 1e-9);
  assert.equal(change.tone, 'negative', 'spending went up');
  const total = find(insights, 'week-vs-last-week');
  assert.ok(Math.abs(total.ratio - 0.06) < 1e-9, `got ${total.ratio}`);
});

test('a lower category is reported with a positive tone', () => {
  const insights = run([tx('expense', 50_000, 'food', '2026-09-15'), tx('expense', 100_000, 'food', '2026-09-09')]);
  const change = find(insights, 'category-change-week');
  assert.equal(change.tone, 'positive');
  assert.ok(change.ratio < 0);
});

test('savings rate this month, and overspending when expenses exceed income', () => {
  const saved = run([tx('income', 1_000_000, 'salary', '2026-09-01'), tx('expense', 750_000, 'food', '2026-09-05')]);
  assert.ok(Math.abs(find(saved, 'savings-rate').ratio - 0.25) < 1e-9);
  const over = run([tx('income', 500_000, 'salary', '2026-09-01'), tx('expense', 750_000, 'food', '2026-09-05')]);
  assert.equal(find(over, 'overspent').amount, 25_000_000);
  assert.equal(find(over, 'savings-rate'), undefined);
});

test('income from other months is ignored for the savings rate', () => {
  const insights = run([tx('income', 9_000_000, 'salary', '2026-08-01'), tx('expense', 100_000, 'food', '2026-09-05')]);
  assert.equal(find(insights, 'savings-rate'), undefined);
});

test('month vs same period last month (day 1..17), tiny changes ignored', () => {
  const up = run([tx('expense', 130_000, 'food', '2026-09-03'), tx('expense', 100_000, 'food', '2026-08-03'), tx('expense', 9_000_000, 'food', '2026-08-25')]);
  assert.ok(Math.abs(find(up, 'month-vs-last-month').ratio - 0.3) < 1e-9, 'Aug 25 is after day 17 and must not count');
  const flat = run([tx('expense', 103_000, 'food', '2026-09-03'), tx('expense', 100_000, 'food', '2026-08-03')]);
  assert.equal(find(flat, 'month-vs-last-month'), undefined, '3% is below the threshold');
});

test('largest expense needs at least 3 expenses; no-spend days counted', () => {
  assert.equal(find(run([tx('expense', 10, 'food', '2026-09-05'), tx('expense', 20, 'food', '2026-09-06')]), 'largest-expense-month'), undefined);
  const insights = run([tx('expense', 10_000, 'food', '2026-09-05'), tx('expense', 90_000, 'shopping', '2026-09-06'), tx('expense', 20_000, 'food', '2026-09-07')]);
  const big = find(insights, 'largest-expense-month');
  assert.equal(big.categoryId, 'shopping');
  assert.equal(big.dayKey, '2026-09-06');
  assert.equal(find(insights, 'no-spend-days').count, 17 - 3);
});

test('busiest weekday appears only with enough history and a clear peak', () => {
  const list = [];
  for (let week = 0; week < 6; week += 1) {
    const saturday = new Date(Date.UTC(2026, 7, 8 + week * 7)); // 8, 15, 22, 29 Aug ... Saturdays
    const key = saturday.toISOString().slice(0, 10);
    list.push(tx('expense', 500_000, 'shopping', key));
    list.push(tx('expense', 20_000, 'food', new Date(saturday.getTime() - 2 * 86_400_000).toISOString().slice(0, 10)));
  }
  const peak = find(run(list), 'busiest-weekday');
  assert.equal(peak.weekday, 5, 'Saturday');
  assert.equal(find(run(list.slice(0, 4)), 'busiest-weekday'), undefined, 'too little data');
});

test('results are sorted by priority and respect the limit; insights never contain advice fields', () => {
  const insights = run([tx('income', 1_000_000, 'salary', '2026-09-01'), tx('expense', 750_000, 'food', '2026-09-05'), tx('expense', 10_000, 'transport', '2026-09-16')], 2);
  assert.equal(insights.length, 2);
  assert.ok(insights[0].priority >= insights[1].priority);
  assert.equal(insights[0].type, 'savings-rate');
});
