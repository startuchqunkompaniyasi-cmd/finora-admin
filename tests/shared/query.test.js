import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachDayKeys } from '../../shared/stats.js';
import { queryTransactions, normalizeQuery, isDefaultQuery, normalizeText } from '../../shared/transactionQuery.js';
import { resolvePeriod } from '../../shared/periods.js';

const tx = (id, type, major, categoryId, iso, description = '', extra = {}) => ({ id, type, amount: major * 100, currency: 'UZS', categoryId, description, note: '', paymentMethod: 'cash', occurredAt: iso, ...extra });
const data = attachDayKeys(
  [
    tx('a', 'expense', 45_000, 'food', '2026-09-20T07:00:00Z', 'Lunch with team'),
    tx('b', 'income', 5_000_000, 'salary', '2026-09-19T05:00:00Z', 'September salary'),
    tx('c', 'expense', 120_000, 'transport', '2026-09-18T05:00:00Z', 'Taxi'),
    tx('d', 'expense', 10, 'food', '2026-09-17T05:00:00Z', 'Coffee', { currency: 'USD', fxRateToBase: 12000 }),
  ],
  'Asia/Tashkent'
);
const ctx = { baseCurrency: 'UZS', categoryName: (id) => ({ food: 'Food', salary: 'Salary', transport: 'Transport' })[id] ?? '' };
const ids = (query) => queryTransactions(data, query, ctx).map((row) => row.id).join('');

test('filters by type, category and inclusive date range', () => {
  assert.equal(ids({ type: 'income' }), 'b');
  assert.equal(ids({ categoryId: 'food' }), 'ad');
  assert.equal(ids({ from: '2026-09-18', to: '2026-09-19' }), 'bc');
});

test('search matches description, category name and amount; all words must match', () => {
  assert.equal(ids({ q: 'taxi' }), 'c');
  assert.equal(ids({ q: 'transport' }), 'c');
  assert.equal(ids({ q: 'lunch team' }), 'a');
  assert.equal(ids({ q: 'lunch coffee' }), '');
  assert.equal(ids({ q: '45000' }), 'a');
});

test('sorts by date and by amount in base currency', () => {
  assert.equal(ids({ sort: 'date-desc' }), 'abcd');
  assert.equal(ids({ sort: 'date-asc' }), 'dcba');
  // c = 120,000 UZS and d = $10 x 12,000 = 120,000 UZS tie; the newer one (c) comes first.
  assert.equal(ids({ sort: 'amount-desc' }), 'bcda');
  assert.equal(ids({ sort: 'amount-asc' }), 'acdb');
});

test('normalizeQuery sanitises untrusted input', () => {
  const q = normalizeQuery({ type: 'hack', sort: '; DROP', from: '2026-09-20', to: '2026-09-01', q: '  hi ' });
  assert.deepEqual(q, { q: 'hi', type: 'all', categoryId: '', from: '2026-09-01', to: '2026-09-20', sort: 'date-desc' });
  assert.ok(isDefaultQuery(normalizeQuery({})));
});

test('resolvePeriod', () => {
  assert.deepEqual(resolvePeriod('month', '2026-09-20'), { from: '2026-09-01', to: '2026-09-20' });
  assert.deepEqual(resolvePeriod('30d', '2026-09-20'), { from: '2026-08-22', to: '2026-09-20' });
  assert.deepEqual(resolvePeriod('year', '2026-09-20'), { from: '2026-01-01', to: '2026-09-20' });
  assert.deepEqual(resolvePeriod('all', '2026-09-20'), { from: '', to: '' });
});

test('search ignores apostrophe variants (Oʻzbek yozuvi)', () => {
  assert.equal(normalizeText("Sovg\u02BBalar, sovg'alar, Sovg\u2019alar"), "sovg'alar, sovg'alar, sovg'alar");
  const rows = attachDayKeys([tx('x', 'expense', 100, 'gifts', '2026-09-20T07:00:00Z', 'Tugʻilgan kun sovgʻasi')], 'Asia/Tashkent');
  const found = queryTransactions(rows, { q: "tug'ilgan sovg'asi" }, { baseCurrency: 'UZS', categoryName: () => 'Sovgʻalar' });
  assert.equal(found.length, 1);
  assert.equal(queryTransactions(rows, { q: "sovg'alar" }, { baseCurrency: 'UZS', categoryName: () => 'Sovgʻalar' }).length, 1, 'category name with ʻ');
});
