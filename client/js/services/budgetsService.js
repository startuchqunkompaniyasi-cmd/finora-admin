/**
 * services/budgetsService.js
 * Byudjetlarni yuklash (joriy davr holati bilan), saqlash (validatsiya bilan) va oʻchirish.
 * Chegara (80%/100%) kesib oʻtilganini aniqlash `checkThresholdCrossings()` da — buni
 * transactionsService bitta xarajat saqlangandan keyin chaqiradi (bir marta bildirishnoma uchun).
 */

import { todayKey, toDayKey } from '../../../shared/dates.js';
import { attachDayKeys } from '../../../shared/stats.js';
import { toBaseMinor } from '../../../shared/money.js';
import { computeBudgetStatus, currentBudgetPeriod, detectThresholdCrossing } from '../../../shared/budgets.js';
import { validateBudgetDraft } from '../../../shared/validators.js';
import { budgetsRepo } from '../data/budgetsRepo.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';

async function context() {
  const [budgets, transactions, profile, categories] = await Promise.all([
    budgetsRepo.list(),
    transactionsRepo.list(),
    profileRepo.get(),
    categoriesRepo.byId(),
  ]);
  return { budgets, transactions: attachDayKeys(transactions, profile.timezone), profile, categories };
}

/** Byudjetlar roʻyxati + har biri uchun hisoblangan holat, eng yuqori foizdan boshlab tartiblangan. */
export async function loadBudgetsData({ now = new Date() } = {}) {
  const { budgets, transactions, profile, categories } = await context();
  const today = todayKey(profile.timezone, now);

  const rows = budgets
    .map((budget) => ({ ...budget, category: categories.get(budget.categoryId), ...computeBudgetStatus(budget, transactions, today, profile.baseCurrency) }))
    .sort((a, b) => b.ratio - a.ratio);

  return { budgets: rows, baseCurrency: profile.baseCurrency, today, expenseCategories: categories.list.filter((c) => c.kind === 'expense' || c.kind === 'both') };
}

export async function loadBudgetFormContext() {
  const { budgets, categories } = await context();
  return { existingBudgets: budgets, categories: categories.list };
}

/** @returns {Promise<{ok:true, budget:object}|{ok:false, errors:object}>} */
export async function saveBudget({ id = null, draft }) {
  const { budgets, categories } = await context();
  const result = validateBudgetDraft(draft, { categories: categories.list, existingBudgets: budgets, excludeId: id });
  if (!result.ok) return { ok: false, errors: result.errors };

  const budget = id ? await budgetsRepo.update(id, result.value) : await budgetsRepo.create(result.value);
  return { ok: true, budget };
}

export function deleteBudget(id) {
  return budgetsRepo.remove(id);
}

/**
 * Bitta xarajat SAQLANGANDAN keyin chaqiriladi: shu kategoriyaga tegishli byudjetlar orasida
 * ENDIGINA kesib oʻtilgan chegara bormi, tekshiradi. Faqat joriy davr (shu hafta/oy) ichidagi
 * tranzaksiyalar uchun ishlaydi — orqaga sanalgan yozuv joriy holatga taʼsir qilmaydi.
 *
 * @param {object} savedTransaction        saqlangan xom yozuv (id, categoryId, type, currency, amount, fxRateToBase, occurredAt)
 * @param {number} [previousBaseAmount]     TAHRIRLASHDA shu tranzaksiyaning eski summasi (bazaviy valyutada, shu kategoriya uchun); yangi qoʻshishda 0
 * @returns {Promise<{budget:object, level:'warning'|'over'}[]>}
 */
export async function checkThresholdCrossings(savedTransaction, previousBaseAmount = 0) {
  if (savedTransaction.type !== 'expense') return [];

  const { budgets, transactions, profile, categories } = await context();
  const today = todayKey(profile.timezone);
  const dayKey = toDayKey(savedTransaction.occurredAt, profile.timezone);
  const relevant = budgets.filter((budget) => budget.categoryId === savedTransaction.categoryId);
  if (relevant.length === 0) return [];

  const newBaseAmount = toBaseMinor(savedTransaction, profile.baseCurrency);
  const crossings = [];
  for (const budget of relevant) {
    const { from, to } = currentBudgetPeriod(budget.period, today);
    if (dayKey < from || dayKey > to) continue;

    const after = computeBudgetStatus(budget, transactions, today, profile.baseCurrency);
    const before = after.spent - (newBaseAmount - previousBaseAmount);
    const level = detectThresholdCrossing(before, after.spent, budget.limitAmount);
    if (level) crossings.push({ budget: { ...budget, category: categories.get(budget.categoryId) }, level });
  }
  return crossings;
}
