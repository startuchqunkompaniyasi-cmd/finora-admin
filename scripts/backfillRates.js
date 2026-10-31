#!/usr/bin/env node
/**
 * scripts/backfillRates.js
 * CBU'dan oxirgi 365 kunlik USD/UZS kursini oldindan yuklab, `server/data/exchange-rates.json`
 * ga yozadi. Ishga tushirish (bir marta, deploy qilishdan oldin yoki cron orqali):
 *
 *   node scripts/backfillRates.js
 *   node scripts/backfillRates.js --days=90
 *
 * Kesh ustidan yozadi. Serverga yuk tushirmaslik uchun soʻrovlar orasida kichik pauza bor.
 * Bitta kunning soʻrovi muvaffaqiyatsiz boʻlsa, jarayon davom etadi (oʻsha kun keyinroq
 * qayta urinilishi mumkin; getHistory() joriy boʻshliqni CBU-ning dam-olish-kuni xatti-
 * harakatiga oʻxshab oldingi maʼlum kun bilan toʻldiradi).
 */

import { todayKey, addDays } from '../shared/dates.js';
import { cbuProvider } from '../server/providers/exchange/cbuProvider.js';
import { exchangeStore } from '../server/services/exchangeStore.js';

const PAIR = 'USD_UZS';
const DELAY_MS = 150;

const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 365;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const today = todayKey('Asia/Tashkent');
  console.log(`Finora: CBU'dan USD/UZS kursini ${days} kun uchun yuklab olish boshlandi...`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < days; i += 1) {
    const dayKey = addDays(today, -i);
    if (await exchangeStore.get(PAIR, dayKey)) {
      skipped += 1;
      continue;
    }
    try {
      const result = await cbuProvider.fetchForDate(dayKey);
      if (result) {
        const usd = result.rates.find((row) => row.currency === 'USD');
        if (usd) {
          await exchangeStore.set(PAIR, result.dayKey, { rate: usd.rate, source: 'cbu' });
          ok += 1;
        } else {
          failed += 1;
        }
      } else {
        failed += 1;
      }
    } catch (error) {
      console.warn(`  ${dayKey}: ${error.message}`);
      failed += 1;
    }
    await sleep(DELAY_MS);
  }

  console.log(`Tayyor. Yangi: ${ok}, allaqachon bor edi: ${skipped}, muvaffaqiyatsiz: ${failed}.`);
  if (failed > days * 0.3) {
    console.warn('Koʻp kun yuklanmadi — internet aloqasini yoki CBU saytining holatini tekshiring.');
  }
}

main().catch((error) => {
  console.error('Backfill muvaffaqiyatsiz tugadi:', error);
  process.exitCode = 1;
});
