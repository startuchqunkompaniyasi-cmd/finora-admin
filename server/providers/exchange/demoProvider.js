/**
 * providers/exchange/demoProvider.js
 * Zanjirdagi oxirgi bosqich: CBU va (agar sozlangan boʻlsa) ikkilamchi provayder ham
 * ishlamaganda koʻrsatiladigan taxminiy kurs. Har doim `demo: true` bilan qaytadi, hech qachon
 * jimgina haqiqiy maʼlumot sifatida koʻrsatilmaydi.
 */

import { buildDemoHistory } from '../../../shared/exchangeDemo.js';

export const demoProvider = {
  id: 'demo',

  async fetchForDate(dayKey) {
    const [{ rate }] = buildDemoHistory(dayKey, 1);
    return { dayKey, rate, demo: true };
  },

  async fetchHistory(fromKey, toKey) {
    return buildDemoHistory(toKey, daysBetweenInclusive(fromKey, toKey)).filter((point) => point.date >= fromKey);
  },
};

function daysBetweenInclusive(fromKey, toKey) {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000) + 1;
}
