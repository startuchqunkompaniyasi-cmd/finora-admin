/**
 * shared/insights.js
 * Smart insights: plain statistical observations computed ONLY from the user's own
 * transactions. They describe what happened ("Transport is 12% higher than last week");
 * they never recommend anything and are not financial advice.
 *
 * Returns structured objects, not sentences. The client turns them into text with i18n,
 * so translations and number formatting stay out of this file (and the server can reuse it).
 *
 * Fairness rule: a week or month in progress is always compared with the SAME number of
 * elapsed days of the previous one, never with its full length.
 *
 * Transactions must carry `dayKey` (see stats.attachDayKeys).
 */

import { toBaseMinor } from './money.js';
import { addDays, daysBetween, endOfMonth, previousMonthStart, startOfMonth, startOfWeek, weekdayIndex } from './dates.js';

/** Thresholds live in one place so they are easy to tune and to test. */
export const INSIGHT_RULES = Object.freeze({
  minWeekdayForComparison: 1, // Tuesday or later (Monday alone is too noisy)
  minDayOfMonthForComparison: 5,
  weekChange: 0.05,
  categoryChange: 0.1,
  monthChange: 0.1,
  categoryMinShare: 0.05, // ignore tiny categories when reporting a % change
  minNoSpendDays: 3,
  minDaysForNoSpend: 7,
  minMonthExpensesForNoSpend: 3, // fewer records = the user probably just has not logged, not "did not spend"
  weekdayWindowDays: 56,
  weekdayMinSpan: 21,
  weekdayMinTransactions: 10,
  weekdayPeakFactor: 1.25,
});

const within = (row, from, to) => row.dayKey >= from && row.dayKey <= to;

function totalsByCategory(rows, from, to) {
  const byCategory = new Map();
  let total = 0;
  for (const row of rows) {
    if (!within(row, from, to)) continue;
    byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0) + row.amount);
    total += row.amount;
  }
  return { total, byCategory };
}

function topEntry(byCategory) {
  let best = null;
  for (const [categoryId, amount] of byCategory) if (!best || amount > best.amount) best = { categoryId, amount };
  return best;
}

/**
 * @param {Object} o
 * @param {object[]} o.transactions
 * @param {string} o.today                day key
 * @param {string} o.baseCurrency
 * @param {number} [o.limit]              max insights returned (highest priority first)
 */
export function generateInsights({ transactions, today, baseCurrency, limit = 6 }) {
  const R = INSIGHT_RULES;
  const expenses = [];
  let monthIncome = 0;

  const monthStart = startOfMonth(today);
  for (const tx of transactions) {
    const amount = toBaseMinor(tx, baseCurrency);
    if (tx.type === 'expense') expenses.push({ dayKey: tx.dayKey, categoryId: tx.categoryId, amount, tx });
    else if (within(tx, monthStart, today)) monthIncome += amount;
  }

  const insights = [];
  const add = (insight) => insights.push(insight);

  // ---------- this week (Monday .. today) ----------
  const weekStart = startOfWeek(today);
  const dayIndex = weekdayIndex(today);
  const week = totalsByCategory(expenses, weekStart, today);

  const topWeek = topEntry(week.byCategory);
  if (topWeek && week.total > 0) {
    add({ id: 'top-category-week', type: 'top-category-week', tone: 'neutral', priority: 60, categoryId: topWeek.categoryId, amount: topWeek.amount, share: topWeek.amount / week.total });
  }

  if (dayIndex >= R.minWeekdayForComparison) {
    const prevStart = addDays(weekStart, -7);
    const prev = totalsByCategory(expenses, prevStart, addDays(prevStart, dayIndex));

    if (prev.total > 0 && week.total > 0) {
      const ratio = (week.total - prev.total) / prev.total;
      if (Math.abs(ratio) >= R.weekChange) {
        add({ id: 'week-vs-last-week', type: 'week-vs-last-week', tone: ratio > 0 ? 'negative' : 'positive', priority: 70, ratio, current: week.total, previous: prev.total });
      }
    }

    // The category whose spending moved the most (in money, not just percent).
    const scale = Math.max(week.total, prev.total);
    let bestChange = null;
    for (const [categoryId, previous] of prev.byCategory) {
      const current = week.byCategory.get(categoryId) ?? 0;
      const ratio = (current - previous) / previous;
      if (Math.abs(ratio) < R.categoryChange || Math.max(current, previous) < scale * R.categoryMinShare) continue;
      const delta = Math.abs(current - previous);
      if (!bestChange || delta > bestChange.delta) bestChange = { categoryId, ratio, current, previous, delta };
    }
    if (bestChange) {
      const { delta, ...data } = bestChange;
      add({ id: 'category-change-week', type: 'category-change-week', tone: data.ratio > 0 ? 'negative' : 'positive', priority: 80, ...data });
    }
  }

  // ---------- this month (1st .. today) ----------
  const month = totalsByCategory(expenses, monthStart, today);
  const monthExpense = month.total;

  if (monthIncome > 0) {
    const ratio = (monthIncome - monthExpense) / monthIncome;
    if (ratio >= 0) add({ id: 'savings-rate', type: 'savings-rate', tone: 'positive', priority: 90, ratio, income: monthIncome, expense: monthExpense });
    else add({ id: 'overspent', type: 'overspent', tone: 'negative', priority: 90, amount: monthExpense - monthIncome });
  }

  const topMonth = topEntry(month.byCategory);
  if (topMonth && monthExpense > 0) {
    add({ id: 'top-category-month', type: 'top-category-month', tone: 'neutral', priority: 65, categoryId: topMonth.categoryId, amount: topMonth.amount, share: topMonth.amount / monthExpense });
  }

  const monthRows = expenses.filter((row) => within(row, monthStart, today));
  if (monthRows.length >= 3) {
    const biggest = monthRows.reduce((best, row) => (row.amount > best.amount ? row : best));
    add({ id: 'largest-expense-month', type: 'largest-expense-month', tone: 'neutral', priority: 50, amount: biggest.amount, categoryId: biggest.categoryId, dayKey: biggest.dayKey });
  }

  const dayOfMonth = Number(today.slice(8, 10));
  if (dayOfMonth >= R.minDayOfMonthForComparison) {
    const prevStart = previousMonthStart(today);
    const prevEndFull = endOfMonth(prevStart);
    const sameDay = addDays(prevStart, dayOfMonth - 1);
    const prev = totalsByCategory(expenses, prevStart, sameDay > prevEndFull ? prevEndFull : sameDay);
    if (prev.total > 0 && monthExpense > 0) {
      const ratio = (monthExpense - prev.total) / prev.total;
      if (Math.abs(ratio) >= R.monthChange) {
        add({ id: 'month-vs-last-month', type: 'month-vs-last-month', tone: ratio > 0 ? 'negative' : 'positive', priority: 75, ratio, current: monthExpense, previous: prev.total });
      }
    }
  }

  if (dayOfMonth >= R.minDaysForNoSpend && monthRows.length >= R.minMonthExpensesForNoSpend) {
    const spendDays = new Set(monthRows.map((row) => row.dayKey));
    const free = dayOfMonth - spendDays.size;
    if (free >= R.minNoSpendDays) add({ id: 'no-spend-days', type: 'no-spend-days', tone: 'positive', priority: 30, count: free, elapsed: dayOfMonth });
  }

  // ---------- long-term pattern: the most expensive weekday ----------
  const windowStart = addDays(today, -(R.weekdayWindowDays - 1));
  const windowRows = expenses.filter((row) => within(row, windowStart, today));
  if (windowRows.length >= R.weekdayMinTransactions) {
    const firstDay = windowRows.reduce((min, row) => (row.dayKey < min ? row.dayKey : min), today);
    const span = daysBetween(firstDay, today) + 1;

    if (span >= R.weekdayMinSpan) {
      const totals = Array(7).fill(0);
      const occurrences = Array(7).fill(0);
      for (const row of windowRows) totals[weekdayIndex(row.dayKey)] += row.amount;
      for (let i = 0; i < span; i += 1) occurrences[weekdayIndex(addDays(firstDay, i))] += 1;

      const averages = totals.map((sum, i) => (occurrences[i] ? sum / occurrences[i] : 0));
      const overall = totals.reduce((a, b) => a + b, 0) / span;
      const peak = averages.indexOf(Math.max(...averages));

      if (occurrences[peak] >= 3 && averages[peak] >= overall * R.weekdayPeakFactor) {
        add({ id: 'busiest-weekday', type: 'busiest-weekday', tone: 'neutral', priority: 40, weekday: peak, average: Math.round(averages[peak]) });
      }
    }
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
