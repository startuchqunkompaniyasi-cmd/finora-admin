import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalProgress, didCompleteGoal } from '../../shared/goals.js';

const TODAY = '2026-09-20';

test('computeGoalProgress: oddiy holat, foiz va qolgan summa', () => {
  const goal = { targetAmount: 10_000_000 * 100, currentAmount: 4_500_000 * 100, deadline: null };
  const p = computeGoalProgress(goal, TODAY);
  assert.ok(Math.abs(p.ratio - 0.45) < 1e-9);
  assert.equal(p.remaining, 5_500_000 * 100);
  assert.equal(p.isComplete, false);
  assert.equal(p.daysRemaining, null, 'muddatsiz maqsadda kun sanalmaydi');
  assert.equal(p.isOverdue, false);
});

test('computeGoalProgress: yakunlangan maqsad (100% dan yuqori boʻlsa ham)', () => {
  const goal = { targetAmount: 1_000_000 * 100, currentAmount: 1_200_000 * 100, deadline: '2026-09-01' };
  const p = computeGoalProgress(goal, TODAY);
  assert.equal(p.isComplete, true);
  assert.equal(p.remaining, 0, 'ortiqcha yigʻilgan boʻlsa ham manfiy boʻlmaydi');
  assert.ok(p.ratio > 1);
  assert.equal(p.isOverdue, false, 'yakunlangan maqsad muddati oʻtgan hisoblanmaydi');
});

test('computeGoalProgress: muddati oʻtgan, hali yakunlanmagan', () => {
  const goal = { targetAmount: 1_000_000 * 100, currentAmount: 300_000 * 100, deadline: '2026-09-10' };
  const p = computeGoalProgress(goal, TODAY);
  assert.equal(p.isOverdue, true);
  assert.equal(p.daysRemaining, -10);
});

test('computeGoalProgress: muddat kelajakda', () => {
  const goal = { targetAmount: 1_000_000 * 100, currentAmount: 300_000 * 100, deadline: '2026-10-05' };
  const p = computeGoalProgress(goal, TODAY);
  assert.equal(p.isOverdue, false);
  assert.equal(p.daysRemaining, 15);
});

test('didCompleteGoal: faqat ENDIGINA 100% ga yetganda true', () => {
  const target = 1_000_000 * 100;
  assert.equal(didCompleteGoal(700_000 * 100, 1_100_000 * 100, target), true);
  assert.equal(didCompleteGoal(1_100_000 * 100, 1_300_000 * 100, target), false, 'allaqachon yakunlangan edi');
  assert.equal(didCompleteGoal(200_000 * 100, 500_000 * 100, target), false, 'hali yetmagan');
  assert.equal(didCompleteGoal(0, 0, 0), false);
});
