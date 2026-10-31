/**
 * services/exchangeService.js
 * Server REST API bilan gaplashadi (server/services/exchangeService.js: kesh -> CBU -> demo).
 * Server umuman ishlamasa (masalan, backend ochilmagan boʻlsa) yoki tarmoq uzilsa, klient
 * shu yerda oʻzining `shared/exchangeDemo.js` bilan demo koʻrsatadi — foydalanuvchi hech qachon
 * xom xato koʻrmaydi.
 */

import { config } from '../core/config.js';
import { todayKey } from '../../../shared/dates.js';
import { convertMinor } from '../../../shared/money.js';
import { buildDemoHistory, demoSnapshot } from '../../../shared/exchangeDemo.js';

async function api(path) {
  const response = await fetch(`${config.apiBase}${path}`);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  return body.data;
}

function localDemoSnapshot() {
  const snapshot = demoSnapshot(todayKey(config.timezone));
  return { base: 'USD', quote: 'UZS', updatedAt: new Date().toISOString(), source: 'demo', demo: true, stale: false, dayKey: todayKey(config.timezone), ...snapshot };
}

/**
 * @typedef {Object} RateSnapshot
 * @property {'USD'} base
 * @property {'UZS'} quote
 * @property {number} rate            UZS / 1 USD
 * @property {number} previousRate
 * @property {number} change          rate - previousRate
 * @property {number} changePct       nisbat, 0.0068 = +0.68%
 * @property {string} updatedAt       ISO vaqt
 * @property {'cbu'|'secondary'|'demo'} source
 * @property {boolean} demo           raqamlar taxminiy boʻlsa true
 * @property {boolean} stale          soʻnggi jonli soʻrov muvaffaqiyatsiz boʻlib, eski qiymat koʻrsatilsa true
 * @property {{date:string, rate:number}[]} history   oxirgi 30 kun
 */

/** @returns {Promise<RateSnapshot>} */
export async function getUsdUzsSnapshot() {
  try {
    return await api('/exchange/rates');
  } catch (error) {
    console.warn('[finora] Server orqali kurs olinmadi, mahalliy demo koʻrsatiladi.', error);
    return localDemoSnapshot();
  }
}

const RANGE_DAYS = { '1D': 2, '7D': 7, '1M': 30, '3M': 90, '6M': 182, '1Y': 365 };
export const HISTORY_RANGES = Object.keys(RANGE_DAYS);

/** @returns {Promise<{range:string, points:{date:string, rate:number, demo?:boolean}[]}>} */
export async function getRateHistory(range = '1M') {
  try {
    return await api(`/exchange/rates/history?range=${range}`);
  } catch (error) {
    console.warn('[finora] Server orqali kurs tarixi olinmadi, mahalliy demo koʻrsatiladi.', error);
    const days = RANGE_DAYS[range] ?? 30;
    return { range, points: buildDemoHistory(todayKey(config.timezone), days).map((point) => ({ ...point, demo: true })) };
  }
}

/**
 * `from` dan `to` ga 1 birlikni aylantirish koeffitsiyenti.
 * @returns {Promise<{rate:number, source:string}>}
 */
export async function getRate(from, to) {
  if (from === to) return { rate: 1, source: 'identity' };
  try {
    const data = await api(`/exchange/convert?from=${from}&to=${to}&amount=1`);
    return { rate: data.rate, source: data.source };
  } catch (error) {
    console.warn('[finora] Server orqali kurs olinmadi, mahalliy demo ishlatiladi.', error);
    const snapshot = localDemoSnapshot();
    if (from === 'USD' && to === 'UZS') return { rate: snapshot.rate, source: 'demo' };
    if (from === 'UZS' && to === 'USD') return { rate: 1 / snapshot.rate, source: 'demo' };
    throw new Error(`Qoʻllab-quvvatlanmaydigan valyuta jufti ${from}/${to}`);
  }
}

/** Minor birlikdagi summani ikkita qoʻllab-quvvatlanadigan valyuta orasida aylantiradi. */
export function convertWithSnapshot(minor, fromCurrency, toCurrency, snapshot) {
  if (fromCurrency === toCurrency) return minor;
  if (fromCurrency === 'USD' && toCurrency === 'UZS') return convertMinor(minor, snapshot.rate);
  if (fromCurrency === 'UZS' && toCurrency === 'USD') return convertMinor(minor, 1 / snapshot.rate);
  throw new Error(`Qoʻllab-quvvatlanmaydigan valyuta jufti ${fromCurrency}/${toCurrency}`);
}
