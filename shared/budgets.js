/**
 * shared/budgets.js
 * Byudjet holatini hisoblash: sarflangan summa, qolgan summa, foiz va holat (ok/warning/over).
 * Byudjet har doim JORIY davr (shu hafta yoki shu oy) uchun hisoblanadi — u davriy takrorlanadi,
 * bitta yozuv saqlanadi (category_id + period boʻyicha noyob).
 */

import { toBaseMinor } from './money.js';
import { startOfWeek, addDays, startOfMonth, endOfMonth } from './dates.js';
import { BUDGET_WARNING_THRESHOLD, BUDGET_LIMIT_THRESHOLD } from './constants.js';

/** @returns {{from:string, to:string}} byudjet turi uchun joriy davr (kun kalitlari) */
export function currentBudgetPeriod(period, today) {
  if (period === 'weekly') {
    const from = startOfWeek(today);
    return { from, to: addDays(from, 6) };
  }
  return { from: startOfMonth(today), to: endOfMonth(today) };
}

/**
 * @param {{categoryId:string, limitAmount:number, period:'weekly'|'monthly'}} budget
 * @param {object[]} transactions   `dayKey` biriktirilgan (attachDayKeys), faqat shu kategoriya SHART EMAS — filtr shu yerda
 * @param {string} today
 * @param {string} baseCurrency
 * @returns {{spent:number, remaining:number, ratio:number, status:'ok'|'warning'|'over', from:string, to:string}}
 */
export function computeBudgetStatus(budget, transactions, today, baseCurrency) {
  const { from, to } = currentBudgetPeriod(budget.period, today);
  const spent = transactions.reduce((sum, tx) => {
    if (tx.type !== 'expense' || tx.categoryId !== budget.categoryId) return sum;
    if (tx.dayKey < from || tx.dayKey > to) return sum;
    return sum + toBaseMinor(tx, baseCurrency);
  }, 0);

  const ratio = budget.limitAmount > 0 ? spent / budget.limitAmount : 0;
  const status = ratio >= BUDGET_LIMIT_THRESHOLD / 100 ? 'over' : ratio >= BUDGET_WARNING_THRESHOLD / 100 ? 'warning' : 'ok';

  return { spent, remaining: budget.limitAmount - spent, ratio, status, from, to };
}

/**
 * Bitta xarajat qoʻshilishi/oʻzgarishi natijasida byudjet chegarasi ENDIGINA kesib oʻtildimi,
 * shuni aniqlaydi (bildirishnoma bir marta chiqishi uchun — har safar emas).
 * @param {number} spentBefore   shu tranzaksiyasiz sarflangan summa (bazaviy valyutada, shu davr uchun)
 * @param {number} spentAfter    shu tranzaksiya bilan
 * @param {number} limitAmount
 * @returns {'warning'|'over'|null}
 */
export function detectThresholdCrossing(spentBefore, spentAfter, limitAmount) {
  if (limitAmount <= 0) return null;
  const before = spentBefore / limitAmount;
  const after = spentAfter / limitAmount;
  if (before < BUDGET_LIMIT_THRESHOLD / 100 && after >= BUDGET_LIMIT_THRESHOLD / 100) return 'over';
  if (before < BUDGET_WARNING_THRESHOLD / 100 && after >= BUDGET_WARNING_THRESHOLD / 100) return 'warning';
  return null;
}
