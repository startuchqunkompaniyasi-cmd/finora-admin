/**
 * services/dashboardService.js
 * Turns raw repository data into exactly what the dashboard renders.
 * All calculations are delegated to shared/stats.js.
 */

import { todayKey, monthKeyOf, startOfWeek, addDays, getZonedParts } from '../../../shared/dates.js';
import { attachDayKeys, summarize, weeklySeries, categoryBreakdown, balanceSeries } from '../../../shared/stats.js';
import { generateInsights } from '../../../shared/insights.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';
import { describeInsights } from './insightsService.js';

const RECENT_LIMIT = 6;
const TREND_DAYS = 30;
const INSIGHT_LIMIT = 4;

export async function loadDashboardData({ now = new Date() } = {}) {
  const [rawTransactions, profile, categories] = await Promise.all([
    transactionsRepo.list(),
    profileRepo.get(),
    categoriesRepo.byId(),
  ]);

  const { timezone, baseCurrency } = profile;
  const today = todayKey(timezone, now);
  const transactions = attachDayKeys(rawTransactions, timezone);

  // Whole-month figures
  const monthPrefix = monthKeyOf(today);
  const monthTransactions = transactions.filter((tx) => tx.dayKey.startsWith(monthPrefix));
  const month = summarize(monthTransactions, baseCurrency);

  // Balance and how much it moved this month
  const balance = profile.openingBalance + summarize(transactions, baseCurrency).net;
  const openingBalance = balance - month.net;
  const balanceChange = {
    amount: month.net,
    ratio: openingBalance > 0 ? month.net / openingBalance : null,
  };

  // Weekly chart (Monday -> Sunday)
  const week = weeklySeries(transactions, today, baseCurrency);
  const weekTotals = week.reduce(
    (totals, day) => ({ income: totals.income + day.income, expense: totals.expense + day.expense }),
    { income: 0, expense: 0 }
  );

  // Spending by category (this month)
  const spending = categoryBreakdown(monthTransactions, baseCurrency, 'expense').map((row) => ({
    ...row,
    category: categories.get(row.categoryId),
  }));

  const recent = [...transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, RECENT_LIMIT)
    .map((tx) => ({ ...tx, category: categories.get(tx.categoryId) }));

  return {
    profile,
    baseCurrency,
    timezone,
    now,
    hour: getZonedParts(now, timezone).hour,
    today,
    weekStart: startOfWeek(today),
    weekEnd: addDays(startOfWeek(today), 6),
    hasTransactions: transactions.length > 0,
    balance,
    balanceChange,
    balanceTrend: balanceSeries(transactions, today, TREND_DAYS, baseCurrency, profile.openingBalance),
    month,
    week,
    weekTotals,
    spending,
    recent,
    insights: describeInsights(generateInsights({ transactions, today, baseCurrency, limit: INSIGHT_LIMIT }), { baseCurrency, categories }),
  };
}

