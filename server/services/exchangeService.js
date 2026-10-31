/**
 * services/exchangeService.js
 * Kurs olish zanjiri: BUGUNGI KESH -> CBU -> IKKILAMCHI PROVAYDER (sozlangan boʻlsa) ->
 * OXIRGI MAʼLUM KURS (stale) -> DEMO.
 *
 * `createExchangeService({ cbuProvider, store, ... })` — testlar uchun soxta provayder va
 * vaqtinchalik kesh bilan toʻliq izolyatsiyalangan nusxa yaratadi (mock kutubxonasi shart emas).
 * Ilovaning oʻzi pastdagi tayyor `exchangeService` yagona nusxasini ishlatadi.
 */

import { todayKey, addDays } from '../../shared/dates.js';
import { cbuProvider } from '../providers/exchange/cbuProvider.js';
import { demoProvider } from '../providers/exchange/demoProvider.js';
import { exchangeStore } from './exchangeStore.js';
import { env } from '../config/env.js';

const PAIR = 'USD_UZS'; // Hozircha yagona juftlik; EUR/GBP/RUB qoʻshish shu konstantani kengaytirish demak

async function tryStep(name, fn) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[finora] Kurs manbasi "${name}" ishlamadi: ${error.message}`);
    return null;
  }
}

export function createExchangeService({ cbuProvider: cbu, store, secondaryProvider = null, timezone = 'Asia/Tashkent' }) {
  /** CBU javobidan USD qatorini ajratib, keshga yozadi. @returns {number|null} */
  async function refreshFromCbu(dayKey) {
    const rows = await tryStep('cbu', () => cbu.fetchLatest());
    if (!rows) return null;
    const usd = rows.find((row) => row.currency === 'USD');
    if (!usd) return null;
    await store.set(PAIR, usd.dayKey, { rate: usd.rate, source: 'cbu' });
    return usd.dayKey === dayKey ? usd.rate : null; // eskiroq sana boʻlsa ham keshga yozildi, lekin "bugungi" sifatida qaytarilmaydi
  }

  /**
   * Kesh + (kichik boʻshliqlar uchun) joyida toʻldirish. Agar diapazonda deyarli haqiqiy nuqta
   * boʻlmasa (masalan, CBU umuman ishlamagan boʻlsa), butun diapazon demo bilan toʻldiriladi va
   * shunday belgilanadi — haqiqiy va demo hech qachon aralashtirilib, "haqiqiy" sifatida koʻrsatilmaydi.
   * @returns {Promise<{date:string, rate:number, demo?:boolean}[]>} eskisidan yangisiga, har kun uchun bitta nuqta
   */
  async function getHistory({ fromKey, toKey, now = new Date(), allowLiveFetch = true }) {
    const today = todayKey(timezone, now);
    const cachedRange = await store.range(PAIR, fromKey, toKey);
    const totalDays = Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000) + 1;

    // Bugungi kun diapazonda boʻlsa va keshda yoʻq boʻlsa, birgina jonli soʻrov bilan toʻldiramiz
    // (bu tez — atigi bitta chaqiruv). Katta tarixiy boʻshliqlarni esa `scripts/backfillRates.js` toʻldiradi.
    if (allowLiveFetch && toKey >= today && !cachedRange[today]) {
      await refreshFromCbu(today);
      Object.assign(cachedRange, await store.range(PAIR, today, today));
    }

    const coverage = Object.keys(cachedRange).length / totalDays;
    if (coverage < 0.5) {
      const demoSeries = await demoProviderFor(store).fetchHistory(fromKey, toKey);
      return demoSeries.map((point) => ({ ...point, demo: true }));
    }

    // Kichik boʻshliqlarni oldingi maʼlum kundan oldinga qarab toʻldiramiz (dam olish kuni xatti-harakati bilan bir xil).
    const points = [];
    let carry = null;
    for (let key = fromKey; key <= toKey; key = addDays(key, 1)) {
      const entry = cachedRange[key];
      if (entry) carry = entry.rate;
      if (carry !== null) points.push({ date: key, rate: carry });
    }
    // Diapazon boshidagi boʻshliq (hali birorta maʼlum kun topilmagan) oldingi eng yaqin yozuv bilan toʻldiriladi.
    if (points.length < totalDays) {
      const before = await store.latestBefore(PAIR, fromKey);
      const filler = before?.rate ?? points[0]?.rate;
      if (filler) {
        const missing = totalDays - points.length;
        points.unshift(...Array.from({ length: missing }, (_, i) => ({ date: addDays(fromKey, i), rate: filler })));
      }
    }
    return points;
  }

  /**
   * @returns {Promise<{rate:number, previousRate:number, change:number, changePct:number,
   *   updatedAt:string, dayKey:string, source:string, demo:boolean, stale:boolean, history:object[]}>}
   */
  async function getSnapshot({ now = new Date() } = {}) {
    const today = todayKey(timezone, now);
    const yesterday = addDays(today, -1);

    let cached = await store.get(PAIR, today);
    if (!cached) {
      const rate = await refreshFromCbu(today);
      if (rate !== null) cached = { rate, source: 'cbu' };
    }

    let source = cached?.source ?? null;
    let demo = false;
    let stale = false;
    let rate = cached?.rate ?? null;
    let effectiveDay = today;

    if (rate === null && secondaryProvider) {
      const secondary = await tryStep('secondary', () => secondaryProvider.fetchForDate(today));
      if (secondary) {
        rate = secondary.rate;
        source = 'secondary';
        await store.set(PAIR, today, { rate, source });
      }
    }

    if (rate === null) {
      const lastKnown = await store.latestBefore(PAIR, today);
      if (lastKnown) {
        rate = lastKnown.rate;
        source = lastKnown.source;
        stale = true;
        effectiveDay = lastKnown.dayKey;
      }
    }

    if (rate === null) {
      const demoPoint = await demoProvider.fetchForDate(today);
      rate = demoPoint.rate;
      source = 'demo';
      demo = true;
    }

    const previousEntry = (await store.get(PAIR, addDays(effectiveDay, -1))) ?? (await store.latestBefore(PAIR, addDays(effectiveDay, -1)));
    const previousRate = demo ? (await demoProvider.fetchForDate(yesterday)).rate : previousEntry?.rate ?? rate;

    return {
      base: 'USD',
      quote: 'UZS',
      rate,
      previousRate,
      change: rate - previousRate,
      changePct: previousRate > 0 ? (rate - previousRate) / previousRate : 0,
      updatedAt: new Date().toISOString(),
      dayKey: effectiveDay,
      source,
      demo,
      stale,
      history: await getHistory({ fromKey: addDays(today, -29), toKey: today, now }),
    };
  }

  /** rate: `from` dan `to` ga 1 birlikni aylantirish koeffitsiyenti. */
  async function getRate(from, to) {
    if (from === to) return { rate: 1, source: 'identity' };
    const snapshot = await getSnapshot();
    if (from === 'USD' && to === 'UZS') return { rate: snapshot.rate, source: snapshot.source };
    if (from === 'UZS' && to === 'USD') return { rate: 1 / snapshot.rate, source: snapshot.source };
    throw new Error(`Qoʻllab-quvvatlanmaydigan valyuta jufti ${from}/${to}`);
  }

  return { getSnapshot, getHistory, getRate };
}

// demoProvider tarix funksiyasi keshdan mustaqil (sof), lekin bir xil imzo uchun kichik yordamchi.
function demoProviderFor() {
  return demoProvider;
}

/** .env da EXCHANGE_SECONDARY_API_KEY boʻlmasa, bu bosqich sukut boʻyicha oʻtkazib yuboriladi. */
const secondaryProvider = env.exchange.secondaryApiKey
  ? null // Haqiqiy ikkinchi provayder shu yerga ulanadi (masalan exchangerate.host). Kalit .env'da, kodda emas.
  : null;

/** Ilova ishlatadigan yagona (haqiqiy CBU + haqiqiy fayl-kesh) nusxa. */
export const exchangeService = createExchangeService({ cbuProvider, store: exchangeStore, secondaryProvider });

export const getSnapshot = exchangeService.getSnapshot;
export const getHistory = exchangeService.getHistory;
export const getRate = exchangeService.getRate;
