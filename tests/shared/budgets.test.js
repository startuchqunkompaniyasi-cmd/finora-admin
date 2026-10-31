import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachDayKeys } from '../../shared/stats.js';
import { currentBudgetPeriod, computeBudgetStatus, detectThresholdCrossing } from '../../shared/budgets.js';

const tz = 'Asia/Tashkent';
const tx = (id, type, major, categoryId, iso, extra = {}) => ({ id, type, amount: major * 100, currency: 'UZS', categoryId, occurredAt: iso, ...extra });

// Payshanba, 17 sentabr 2026. Hafta: Dush 14 - Yak 20.
const TODAY = '2026-09-17';

test('currentBudgetPeriod: haftalik = shu hafta, oylik = shu oy', () => {
  assert.deepEqual(currentBudgetPeriod('weekly', TODAY), { from: '2026-09-14', to: '2026-09-20' });
  assert.deepEqual(currentBudgetPeriod('monthly', TODAY), { from: '2026-09-01', to: '2026-09-30' });
});

test('computeBudgetStatus: faqat mos kategoriya va davrdagi xarajatlar hisoblanadi', () => {
  const data = attachDayKeys(
    [
      tx('1', 'expense', 300_000, 'food', '2026-09-15T07:00:00Z'), // shu hafta, shu kategoriya
      tx('2', 'expense', 200_000, 'food', '2026-09-16T07:00:00Z'), // shu hafta, shu kategoriya
      tx('3', 'expense', 900_000, 'food', '2026-09-01T07:00:00Z'), // shu oy, lekin OLDINGI hafta
      tx('4', 'expense', 500_000, 'transport', '2026-09-15T07:00:00Z'), // boshqa kategoriya
      tx('5', 'income', 5_000_000, 'salary', '2026-09-15T07:00:00Z'), // kirim — hisobga olinmaydi
    ],
    tz
  );

  const weekly = computeBudgetStatus({ categoryId: 'food', limitAmount: 1_000_000 * 100, period: 'weekly' }, data, TODAY, 'UZS');
  assert.equal(weekly.spent, 500_000 * 100);
  assert.equal(weekly.remaining, 500_000 * 100);
  assert.ok(Math.abs(weekly.ratio - 0.5) < 1e-9);
  assert.equal(weekly.status, 'ok');

  const monthly = computeBudgetStatus({ categoryId: 'food', limitAmount: 1_000_000 * 100, period: 'monthly' }, data, TODAY, 'UZS');
  assert.equal(monthly.spent, 1_400_000 * 100, 'oylik hisobga 09-01 ham kiradi');
  assert.equal(monthly.status, 'over');
});

test('computeBudgetStatus: 80% va 100% chegaralari', () => {
  const data = attachDayKeys([tx('1', 'expense', 800_000, 'food', '2026-09-15T07:00:00Z')], tz);
  const warn = computeBudgetStatus({ categoryId: 'food', limitAmount: 1_000_000 * 100, period: 'weekly' }, data, TODAY, 'UZS');
  assert.equal(warn.status, 'warning');
  const ok = computeBudgetStatus({ categoryId: 'food', limitAmount: 1_000_001 * 100, period: 'weekly' }, data, TODAY, 'UZS');
  assert.notEqual(ok.status, 'warning');
});

test('detectThresholdCrossing: faqat ENDIGINA kesib oʻtilganda ishga tushadi', () => {
  const limit = 1_000_000 * 100;
  assert.equal(detectThresholdCrossing(700_000 * 100, 850_000 * 100, limit), 'warning');
  assert.equal(detectThresholdCrossing(850_000 * 100, 900_000 * 100, limit), null, 'allaqachon 80% dan yuqori edi');
  assert.equal(detectThresholdCrossing(950_000 * 100, 1_050_000 * 100, limit), 'over');
  assert.equal(detectThresholdCrossing(300_000 * 100, 500_000 * 100, limit), null, 'hech qaysi chegara kesilmagan');
  assert.equal(detectThresholdCrossing(0, 0, 0), null, 'limit 0 boʻlsa hisoblanmaydi');
});
