/**
 * services/statisticsService.js
 * Statistika sahifasi uchun maʼlumotni bir marta yuklaydi. Barcha hisob-kitob shared/stats.js va
 * shared/insights.js da (server ham xuddi shu kodni ishlatadi).
 */

import { todayKey } from '../../../shared/dates.js';
import { attachDayKeys, availableYears } from '../../../shared/stats.js';
import { generateInsights } from '../../../shared/insights.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';
import { describeInsights } from './insightsService.js';

export async function loadStatisticsData({ now = new Date(), insightLimit = 6 } = {}) {
  const [raw, profile, categories] = await Promise.all([transactionsRepo.list(), profileRepo.get(), categoriesRepo.byId()]);
  const { timezone, baseCurrency } = profile;
  const today = todayKey(timezone, now);
  const transactions = attachDayKeys(raw, timezone).map((tx) => ({ ...tx, category: categories.get(tx.categoryId) }));

  return {
    profile,
    baseCurrency,
    timezone,
    today,
    categories,
    transactions,
    years: availableYears(transactions, today),
    earliestDayKey: transactions.reduce((min, tx) => (min === null || tx.dayKey < min ? tx.dayKey : min), null),
    insights: describeInsights(generateInsights({ transactions, today, baseCurrency, limit: insightLimit }), { baseCurrency, categories }),
  };
}
