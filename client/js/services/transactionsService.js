/**
 * services/transactionsService.js
 * Everything the Transactions page and the transaction form need: loading, drafts,
 * validated saving, deleting. Validation itself lives in shared/validators.js.
 */

import { CURRENCIES } from '../../../shared/constants.js';
import { getZonedParts, todayKey } from '../../../shared/dates.js';
import { attachDayKeys } from '../../../shared/stats.js';
import { validateTransactionDraft } from '../../../shared/validators.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';
import { getRate } from './exchangeService.js';
import { toBaseMinor } from '../../../shared/money.js';
import { checkThresholdCrossings } from './budgetsService.js';

const pad = (n) => String(n).padStart(2, '0');

/** Everything the list page renders, with day keys and category objects attached once. */
export async function loadTransactionsData({ now = new Date() } = {}) {
  const [raw, profile, categories] = await Promise.all([transactionsRepo.list(), profileRepo.get(), categoriesRepo.byId()]);
  const transactions = attachDayKeys(raw, profile.timezone).map((tx) => ({ ...tx, category: categories.get(tx.categoryId) }));

  return {
    profile,
    baseCurrency: profile.baseCurrency,
    timezone: profile.timezone,
    today: todayKey(profile.timezone, now),
    categories,
    transactions,
  };
}

/** Data the form needs before it opens. */
export async function loadFormContext({ now = new Date() } = {}) {
  const [profile, categories] = await Promise.all([profileRepo.get(), categoriesRepo.list()]);
  return { profile, categories, today: todayKey(profile.timezone, now), now };
}

export function emptyDraft({ profile, today, now = new Date() }) {
  const { hour, minute } = getZonedParts(now, profile.timezone);
  return {
    type: 'expense',
    amount: '',
    currency: profile.baseCurrency,
    categoryId: '',
    description: '',
    note: '',
    paymentMethod: 'card',
    date: today,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

export function draftFromTransaction(tx, timezone) {
  const { year, month, day, hour, minute } = getZonedParts(tx.occurredAt, timezone);
  return {
    type: tx.type,
    amount: String(tx.amount / 100),
    currency: tx.currency,
    categoryId: tx.categoryId,
    description: tx.description ?? '',
    note: tx.note ?? '',
    paymentMethod: tx.paymentMethod,
    date: `${year}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

/**
 * Validate and save. Returns { ok: true, transaction } or { ok: false, errors }.
 * Throws only for unexpected problems (storage failure), which the caller reports.
 */
export async function saveTransaction({ id = null, draft, now = new Date() }) {
  const [profile, categories] = await Promise.all([profileRepo.get(), categoriesRepo.list()]);
  const existing = id ? await transactionsRepo.get(id) : null;
  if (id && !existing) throw new Error('This transaction no longer exists.');

  // A foreign-currency transaction remembers the rate it was created with, so old reports never change.
  let fxRate = null;
  let fxRateSource = null;
  if (CURRENCIES[draft.currency] && draft.currency !== profile.baseCurrency) {
    if (existing?.currency === draft.currency && existing.fxRateToBase) {
      fxRate = existing.fxRateToBase;
      fxRateSource = existing.fxRateSource ?? null;
    } else {
      try {
        ({ rate: fxRate, source: fxRateSource } = await getRate(draft.currency, profile.baseCurrency));
      } catch (error) {
        console.error('[finora] Exchange rate lookup failed while saving a transaction', error);
      }
    }
  }

  const result = validateTransactionDraft(draft, { timezone: profile.timezone, baseCurrency: profile.baseCurrency, categories, fxRate, now });
  if (!result.ok) return { ok: false, errors: result.errors };

  const record = { ...result.value, fxRateSource: result.value.fxRateToBase ? fxRateSource : null };
  const transaction = id
    ? await transactionsRepo.update(id, { ...record, isDemo: false }) // an edited sample row becomes the user's own
    : await transactionsRepo.create(record);

  // Byudjet chegarasi endigina kesib oʻtilganmi — faqat shu kategoriya oʻzgarmagan boʻlsa "oldingi summa" hisobga olinadi.
  const previousBaseAmount = existing && existing.categoryId === transaction.categoryId ? toBaseMinor(existing, profile.baseCurrency) : 0;
  const budgetCrossings = await checkThresholdCrossings(transaction, previousBaseAmount).catch((error) => {
    console.error('[finora] Byudjet chegarasini tekshirib boʻlmadi', error);
    return [];
  });

  return { ok: true, transaction, budgetCrossings };
}

export function deleteTransaction(id) {
  return transactionsRepo.remove(id);
}
