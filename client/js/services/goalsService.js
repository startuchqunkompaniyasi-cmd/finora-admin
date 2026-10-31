/**
 * services/goalsService.js
 * Maqsadlarni yuklash (hisoblangan progress bilan), saqlash, oʻchirish va "pul qoʻshish" (contribute).
 */

import { todayKey } from '../../../shared/dates.js';
import { computeGoalProgress, didCompleteGoal } from '../../../shared/goals.js';
import { validateGoalDraft, validateContribution } from '../../../shared/validators.js';
import { goalsRepo } from '../data/goalsRepo.js';
import { profileRepo } from '../data/profileRepo.js';

/** Faol maqsadlar avval (muddati yaqinlari tepada), yakunlanganlar oxirida. */
function sortGoals(rows) {
  return [...rows].sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    if (a.daysRemaining === null) return b.daysRemaining === null ? 0 : 1;
    if (b.daysRemaining === null) return -1;
    return a.daysRemaining - b.daysRemaining;
  });
}

export async function loadGoalsData({ now = new Date() } = {}) {
  const [goals, profile] = await Promise.all([goalsRepo.list(), profileRepo.get()]);
  const today = todayKey(profile.timezone, now);
  const rows = sortGoals(goals.map((goal) => ({ ...goal, ...computeGoalProgress(goal, today) })));
  return { goals: rows, baseCurrency: profile.baseCurrency, today };
}

export async function loadGoalFormContext({ now = new Date() } = {}) {
  const profile = await profileRepo.get();
  return { baseCurrency: profile.baseCurrency, today: todayKey(profile.timezone, now) };
}

/** @returns {Promise<{ok:true, goal:object}|{ok:false, errors:object}>} */
export async function saveGoal({ id = null, draft }) {
  const result = validateGoalDraft(draft);
  if (!result.ok) return { ok: false, errors: result.errors };

  const goal = id ? await goalsRepo.update(id, result.value) : await goalsRepo.create(result.value);
  return { ok: true, goal };
}

export function deleteGoal(id) {
  return goalsRepo.remove(id);
}

/**
 * Maqsadga bitta hissa qoʻshadi (currentAmount ni oshiradi).
 * @returns {Promise<{ok:true, goal:object, justCompleted:boolean}|{ok:false, error:string}>}
 */
export async function contributeToGoal(id, rawAmount) {
  const check = validateContribution(rawAmount);
  if (!check.ok) return { ok: false, error: check.error };

  const goal = await goalsRepo.get(id);
  if (!goal) return { ok: false, error: 'Bu maqsad topilmadi.' };

  const nextCurrent = Math.min(goal.currentAmount + check.amount, Number.MAX_SAFE_INTEGER);
  const updated = await goalsRepo.update(id, { currentAmount: nextCurrent });
  return { ok: true, goal: updated, justCompleted: didCompleteGoal(goal.currentAmount, nextCurrent, goal.targetAmount) };
}
