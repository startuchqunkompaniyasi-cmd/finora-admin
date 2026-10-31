/**
 * shared/transactionQuery.js
 * Search, filter and sort. Runs in the browser today (localStorage mode) and on the server
 * once the REST API is used, so both return identical results.
 * Transactions must carry `dayKey` (see stats.attachDayKeys).
 */

import { toBaseMinor } from './money.js';
import { isValidDayKey } from './dates.js';
import { TRANSACTION_TYPES, LIMITS } from './constants.js';

/**
 * Qidiruv uchun matnni tenglashtirish: kichik harf va barcha apostrof turlari (ʻ ʼ ’ ‘ ` ´) bitta belgiga.
 * Shunda "sovg'alar" deb yozgan foydalanuvchi "Sovgʻalar" kategoriyasini topadi.
 */
export function normalizeText(text) {
  return String(text ?? '').toLowerCase().replace(/[\u02BB\u02BC\u2018\u2019`\u00B4]/g, "'");
}

export const SORTS = Object.freeze(['date-desc', 'date-asc', 'amount-desc', 'amount-asc']);
export const DEFAULT_QUERY = Object.freeze({ q: '', type: 'all', categoryId: '', from: '', to: '', sort: 'date-desc' });

/** Turn untrusted input (URL params, request query) into a safe, complete query object. */
export function normalizeQuery(raw = {}) {
  const type = raw.type === 'all' || TRANSACTION_TYPES.includes(raw.type) ? raw.type : DEFAULT_QUERY.type;
  const from = isValidDayKey(raw.from) ? raw.from : '';
  const to = isValidDayKey(raw.to) ? raw.to : '';

  return {
    q: String(raw.q ?? '').trim().slice(0, LIMITS.searchMax),
    type,
    categoryId: String(raw.categoryId ?? '').trim().slice(0, 64),
    // swap if the range was entered backwards
    from: from && to && from > to ? to : from,
    to: from && to && from > to ? from : to,
    sort: SORTS.includes(raw.sort) ? raw.sort : DEFAULT_QUERY.sort,
  };
}

export function isDefaultQuery(query) {
  return Object.keys(DEFAULT_QUERY).every((key) => query[key] === DEFAULT_QUERY[key]);
}

/**
 * @param {object[]} transactions
 * @param {object} query           see normalizeQuery
 * @param {{baseCurrency:string, categoryName:(id:string)=>string}} context
 */
export function queryTransactions(transactions, rawQuery, { baseCurrency, categoryName = () => '' }) {
  const query = normalizeQuery(rawQuery);
  const tokens = normalizeText(query.q).split(/\s+/).filter(Boolean);

  const rows = transactions.filter((tx) => {
    if (query.type !== 'all' && tx.type !== query.type) return false;
    if (query.categoryId && tx.categoryId !== query.categoryId) return false;
    if (query.from && tx.dayKey < query.from) return false;
    if (query.to && tx.dayKey > query.to) return false;
    if (tokens.length === 0) return true;

    const haystack = normalizeText([tx.description, tx.note, categoryName(tx.categoryId), tx.paymentMethod, String(tx.amount / 100)].join(' '));
    return tokens.every((token) => haystack.includes(token));
  });

  const byNewest = (a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id);
  const comparators = {
    'date-desc': byNewest,
    'date-asc': (a, b) => -byNewest(a, b),
    'amount-desc': (a, b) => toBaseMinor(b, baseCurrency) - toBaseMinor(a, baseCurrency) || byNewest(a, b),
    'amount-asc': (a, b) => toBaseMinor(a, baseCurrency) - toBaseMinor(b, baseCurrency) || byNewest(a, b),
  };
  return rows.sort(comparators[query.sort]);
}
