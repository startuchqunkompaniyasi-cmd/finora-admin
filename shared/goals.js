/**
 * shared/goals.js
 * Moliyaviy maqsad progressi. Byudjetlardan farqli oʻlaroq, "sarflangan" avtomatik hisoblanmaydi —
 * foydalanuvchi qoʻlda "pul qoʻshadi" (contribute), currentAmount shu tarzda oshadi.
 */

import { daysBetween } from './dates.js';

/**
 * @param {{targetAmount:number, currentAmount:number, deadline:string|null}} goal
 * @param {string} today
 * @returns {{ratio:number, remaining:number, isComplete:boolean, daysRemaining:number|null, isOverdue:boolean}}
 */
export function computeGoalProgress(goal, today) {
  const isComplete = goal.currentAmount >= goal.targetAmount;
  const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  let daysRemaining = null;
  let isOverdue = false;
  if (goal.deadline) {
    daysRemaining = daysBetween(today, goal.deadline);
    isOverdue = !isComplete && daysRemaining < 0;
  }

  return { ratio, remaining, isComplete, daysRemaining, isOverdue };
}

/** Bitta hissa (contribute) natijasida maqsad ENDIGINA yakunlandimi (100% ni kesib oʻtdimi)? */
export function didCompleteGoal(currentBefore, currentAfter, targetAmount) {
  return targetAmount > 0 && currentBefore < targetAmount && currentAfter >= targetAmount;
}
