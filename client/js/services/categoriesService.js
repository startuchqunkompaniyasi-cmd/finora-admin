/**
 * services/categoriesService.js
 * Per-category totals for the Categories page.
 */

import { attachDayKeys, categoryBreakdown } from '../../../shared/stats.js';
import { todayKey } from '../../../shared/dates.js';
import { resolvePeriod } from '../../../shared/periods.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';

/**
 * @param {{kind:'expense'|'income', period:'month'|'30d'|'year'|'all', now?:Date}} options
 * Lists EVERY category usable for `kind`, including ones with no activity (total 0).
 */
export async function loadCategorySummaries({ kind, period, now = new Date() }) {
  const [raw, profile, categories] = await Promise.all([transactionsRepo.list(), profileRepo.get(), categoriesRepo.list()]);
  const today = todayKey(profile.timezone, now);
  const { from, to } = resolvePeriod(period, today);

  const inRange = attachDayKeys(raw, profile.timezone).filter(
    (tx) => tx.type === kind && (!from || tx.dayKey >= from) && (!to || tx.dayKey <= to)
  );
  const totals = new Map(categoryBreakdown(inRange, profile.baseCurrency, kind).map((row) => [row.categoryId, row]));

  const rows = categories
    .filter((category) => category.kind === 'both' || category.kind === kind)
    .map((category) => {
      const row = totals.get(category.id);
      return { category, total: row?.total ?? 0, count: row?.count ?? 0, share: row?.share ?? 0 };
    })
    .sort((a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name));

  return {
    kind,
    period,
    from,
    to,
    today,
    baseCurrency: profile.baseCurrency,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    transactionCount: inRange.length,
    rows,
  };
}
