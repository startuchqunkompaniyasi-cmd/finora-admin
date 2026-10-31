/**
 * services/exchangeStore.js
 * Kurslar uchun oddiy fayl-kesh.
 *
 * Bu VAQTINCHALIK yechim: 8-bosqichda `exchange_rates` jadvali (SQLite) shu oʻrinni egallaydi va
 * bu interfeys bilan bir xil boʻladi (get/set/range), shuning uchun oʻsha bosqichda faqat
 * shu modul ichi almashadi, chaqiruvchi kod oʻzgarmaydi.
 *
 * Fayl: { "USD_UZS": { "2026-09-19": { rate, source, fetchedAt } } }
 *
 * `createExchangeStore(filePath)` har bir chaqiriqda mustaqil, izolyatsiyalangan nusxa yaratadi
 * (testlar oʻz vaqtinchalik fayli bilan ishlaydi). Ilovaning oʻzi pastdagi tayyor `exchangeStore`
 * yagona nusxasini ishlatadi.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export function createExchangeStore(filePath) {
  let cache = null;
  let writeQueue = Promise.resolve();

  async function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[finora] Kurslar keshini oʻqib boʻlmadi, boʻsh holatdan boshlanadi.', error);
      cache = {};
    }
    return cache;
  }

  function persist() {
    writeQueue = writeQueue
      .then(async () => {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(cache), 'utf8');
      })
      .catch((error) => console.error('[finora] Kurslar keshini saqlab boʻlmadi.', error));
    return writeQueue;
  }

  return {
    async get(pair, dayKey) {
      return (await load())[pair]?.[dayKey] ?? null;
    },

    async set(pair, dayKey, entry) {
      const data = await load();
      data[pair] ??= {};
      data[pair][dayKey] = { ...entry, fetchedAt: new Date().toISOString() };
      await persist();
      return data[pair][dayKey];
    },

    /** @returns {Promise<Record<string,{rate:number, source:string, fetchedAt:string}>>} fromKey..toKey (bor kunlar) */
    async range(pair, fromKey, toKey) {
      const data = (await load())[pair] ?? {};
      const result = {};
      for (const [dayKey, entry] of Object.entries(data)) {
        if (dayKey >= fromKey && dayKey <= toKey) result[dayKey] = entry;
      }
      return result;
    },

    /** Berilgan kundan oldingi (yoki teng) eng soʻnggi yozuv — "eski, lekin maʼlum" fallback uchun. */
    async latestBefore(pair, dayKey) {
      const data = (await load())[pair] ?? {};
      let best = null;
      for (const [key, entry] of Object.entries(data)) {
        if (key <= dayKey && (!best || key > best.dayKey)) best = { dayKey: key, ...entry };
      }
      return best;
    },
  };
}

export const exchangeStore = createExchangeStore(path.join(env.paths.root, 'server', 'data', 'exchange-rates.json'));
