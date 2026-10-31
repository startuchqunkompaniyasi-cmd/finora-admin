/**
 * shared/stats.js
 * Pure statistics functions. No DOM, no storage, no network.
 * The client (local mode) and the server (API mode) run the SAME code, so the numbers
 * can never disagree between the two.
 *
 * All functions expect transactions that already carry a `dayKey`
 * (see attachDayKeys) so timezone conversion happens once per transaction.
 */

import { toBaseMinor } from './money.js';
import { toDayKey, addDays, weekDayKeys, weekdayIndex, endOfMonth, daysBetween } from './dates.js';

export function attachDayKeys(transactions, timeZone) {
  return transactions.map((tx) => ({ ...tx, dayKey: toDayKey(tx.occurredAt, timeZone) }));
}

/** Totals in base currency (minor units). `net` is income - expense. */
export function summarize(transactions, baseCurrency) {
  let income = 0;
  let expense = 0;

  for (const tx of transactions) {
    const amount = toBaseMinor(tx, baseCurrency);
    if (tx.type === 'income') income += amount;
    else expense += amount;
  }

  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? net / income : null,
    count: transactions.length,
  };
}

/** Transactions whose day is within [fromKey, toKey] (inclusive). */
export function filterByDayRange(transactions, fromKey, toKey) {
  return transactions.filter((tx) => tx.dayKey >= fromKey && tx.dayKey <= toKey);
}

/**
 * Monday -> Sunday buckets for the week containing `anchorDayKey`.
 * @returns {{dayKey:string, weekday:number, income:number, expense:number}[]}
 */
export function weeklySeries(transactions, anchorDayKey, baseCurrency) {
  const buckets = new Map(
    weekDayKeys(anchorDayKey).map((dayKey) => [
      dayKey,
      { dayKey, weekday: weekdayIndex(dayKey), income: 0, expense: 0 },
    ])
  );

  for (const tx of transactions) {
    const bucket = buckets.get(tx.dayKey);
    if (!bucket) continue;
    bucket[tx.type === 'income' ? 'income' : 'expense'] += toBaseMinor(tx, baseCurrency);
  }
  return [...buckets.values()];
}

/**
 * Totals per category for one transaction type, largest first.
 * `share` is a 0..1 ratio of the grand total.
 */
export function categoryBreakdown(transactions, baseCurrency, type = 'expense') {
  const totals = new Map();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const amount = toBaseMinor(tx, baseCurrency);
    const row = totals.get(tx.categoryId) ?? { categoryId: tx.categoryId, total: 0, count: 0 };
    row.total += amount;
    row.count += 1;
    totals.set(tx.categoryId, row);
    grandTotal += amount;
  }

  return [...totals.values()]
    .map((row) => ({ ...row, share: grandTotal > 0 ? row.total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Running balance at the end of each of the last `days` days (oldest first).
 * Balance = startingBalance + all income - all expenses up to and including that day.
 */
export function balanceSeries(transactions, endDayKey, days, baseCurrency, startingBalance = 0) {
  const startKey = addDays(endDayKey, -(days - 1));
  const netByDay = new Map();
  let opening = startingBalance;

  for (const tx of transactions) {
    if (tx.dayKey > endDayKey) continue;
    const signed = (tx.type === 'income' ? 1 : -1) * toBaseMinor(tx, baseCurrency);
    if (tx.dayKey < startKey) opening += signed;
    else netByDay.set(tx.dayKey, (netByDay.get(tx.dayKey) ?? 0) + signed);
  }

  let running = opening;
  return Array.from({ length: days }, (_, i) => {
    const dayKey = addDays(startKey, i);
    running += netByDay.get(dayKey) ?? 0;
    return { dayKey, balance: running };
  });
}

/* ==========================================================================
   Period statistics (weekly / monthly / yearly pages)
   ========================================================================== */

/**
 * Days of [fromKey, toKey] that have already happened. Averages must divide by THIS,
 * not by the full length, or the current week/month would look artificially cheap.
 */
export function elapsedDays(fromKey, toKey, todayKey) {
  if (todayKey < fromKey) return 0;
  return daysBetween(fromKey, toKey < todayKey ? toKey : todayKey) + 1;
}

/** Sorted (newest first) list of years that have data, always including the current year. */
export function availableYears(transactions, todayKey) {
  const years = new Set([Number(todayKey.slice(0, 4))]);
  for (const tx of transactions) years.add(Number(tx.dayKey.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}

/**
 * Totals and highlights for one week. `series` comes from weeklySeries().
 * Highest / lowest spending day only consider days that have already happened.
 */
export function weekStatistics(series, todayKey) {
  const counted = series.filter((day) => day.dayKey <= todayKey);
  const income = series.reduce((sum, day) => sum + day.income, 0);
  const expense = series.reduce((sum, day) => sum + day.expense, 0);
  const days = counted.length;

  let highest = null;
  let lowest = null;
  for (const day of counted) {
    if (!highest || day.expense > highest.amount) highest = { dayKey: day.dayKey, amount: day.expense };
    if (!lowest || day.expense < lowest.amount) lowest = { dayKey: day.dayKey, amount: day.expense };
  }
  if (highest && highest.amount === 0) highest = lowest = null; // nothing was spent: no meaningful extremes

  return {
    income,
    expense,
    net: income - expense,
    daysCounted: days,
    avgDailySpending: days ? Math.round(expense / days) : 0,
    highest,
    lowest,
  };
}

/** Twelve month buckets for `year` (January = month 1). */
export function monthSeries(transactions, year, baseCurrency) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0, net: 0, count: 0 }));
  const prefix = `${year}-`;

  for (const tx of transactions) {
    if (!tx.dayKey.startsWith(prefix)) continue;
    const bucket = months[Number(tx.dayKey.slice(5, 7)) - 1];
    bucket[tx.type === 'income' ? 'income' : 'expense'] += toBaseMinor(tx, baseCurrency);
    bucket.count += 1;
  }
  for (const bucket of months) bucket.net = bucket.income - bucket.expense;
  return months;
}

function largest(transactions, type, baseCurrency) {
  let best = null;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const amount = toBaseMinor(tx, baseCurrency);
    if (!best || amount > best.amount) best = { transaction: tx, amount };
  }
  return best;
}

/** Everything the Monthly page shows for one month. */
export function monthStatistics(transactions, year, month, todayKey, baseCurrency) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthTransactions = transactions.filter((tx) => tx.dayKey.startsWith(first.slice(0, 7)));
  const totals = summarize(monthTransactions, baseCurrency);
  const days = elapsedDays(first, endOfMonth(first), todayKey);

  return {
    ...totals,
    daysCounted: days,
    avgDailyExpense: days ? Math.round(totals.expense / days) : 0,
    avgDailyIncome: days ? Math.round(totals.income / days) : 0,
    largestExpense: largest(monthTransactions, 'expense', baseCurrency),
    largestIncome: largest(monthTransactions, 'income', baseCurrency),
    transactions: monthTransactions,
  };
}

/** Totals and highlights for a year. `months` comes from monthSeries(). */
export function yearStatistics(months) {
  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expense = months.reduce((sum, m) => sum + m.expense, 0);
  const active = months.filter((m) => m.count > 0);

  const pick = (list, score) => list.reduce((best, m) => (best === null || score(m) > score(best) ? m : best), null);
  const topSpending = pick(active, (m) => m.expense);

  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? (income - expense) / income : null,
    bestMonth: active.length ? pick(active, (m) => m.net) : null,
    topSpendingMonth: topSpending && topSpending.expense > 0 ? topSpending : null,
    activeMonths: active.length,
  };
}
