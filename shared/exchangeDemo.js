/**
 * shared/exchangeDemo.js
 * CBU va zaxira provayder ham ishlamaganda koʻrsatiladigan taxminiy (demo) kurs tarixi.
 * Sof funksiya: DOM yoʻq, tarmoq yoʻq. Server (fallback) va klient (tarmoqsiz ishlash) bir xil
 * algoritmni ishlatadi, shuning uchun ikkalasida ham bir xil "demo" raqamlar chiqadi.
 */

import { addDays } from './dates.js';

const DEMO_ANCHOR_RATE = 12150; // 2026-yil sentabr oxiridagi taxminiy USD/UZS

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `endDayKey` bilan tugaydigan, ortga qarab tasodifiy yurish bilan hosil qilingan qatʼiy (seeded)
 * taxminiy tarix. Har chaqiriqda bir xil natija beradi, shuning uchun sahifa yangilanganda demo
 * grafik "sakramaydi".
 * @returns {{date:string, rate:number}[]} eskisidan yangisiga
 */
export function buildDemoHistory(endDayKey, days = 365) {
  const random = mulberry32(20260920);
  const rates = new Array(days);
  rates[days - 1] = DEMO_ANCHOR_RATE;
  for (let i = days - 1; i > 0; i -= 1) {
    rates[i - 1] = Math.max(1, rates[i] - random() * 65 + 28);
  }
  return rates.map((rate, i) => ({ date: addDays(endDayKey, i - (days - 1)), rate: Math.round(rate * 100) / 100 }));
}

/** @returns {{rate:number, previousRate:number, change:number, changePct:number}} */
export function demoSnapshot(endDayKey) {
  const history = buildDemoHistory(endDayKey, 2);
  const [previous, current] = history;
  return { rate: current.rate, previousRate: previous.rate, change: current.rate - previous.rate, changePct: (current.rate - previous.rate) / previous.rate, history: buildDemoHistory(endDayKey, 365) };
}
