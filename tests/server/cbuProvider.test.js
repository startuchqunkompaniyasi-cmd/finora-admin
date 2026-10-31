/**
 * tests/server/cbuProvider.test.js
 * CBU javob shaklini (2026-yil sentabrda tekshirilgan haqiqiy JSON) parse qilish mantigʻi.
 * global.fetch shu yerda oʻrnatiladi (tarmoq kerak emas), CBU'ning haqiqiy javobiga oʻxshash
 * maʼlumot bilan.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cbuProvider } from '../../server/providers/exchange/cbuProvider.js';

const REAL_SAMPLE = [
  { id: 68, Code: '840', Ccy: 'USD', CcyNm_UZ: 'AQSH dollari', Nominal: '1', Rate: '11839.59', Diff: '6.22', Date: '19.09.2026' },
  { id: 20, Code: '978', Ccy: 'EUR', CcyNm_UZ: 'EVRO', Nominal: '1', Rate: '13569.35', Diff: '-8.26', Date: '19.09.2026' },
  { id: 25, Code: '360', Ccy: 'IDR', CcyNm_UZ: 'Indoneziya rupiyasi', Nominal: '10', Rate: '6.68', Diff: '0.01', Date: '19.09.2026' },
];

let originalFetch;
let lastUrl;
let respond;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    lastUrl = url;
    return respond();
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchLatest: haqiqiy CBU javobini toʻgʻri parse qiladi (Nominal hisobga olingan)', async () => {
  respond = () => ({ ok: true, json: async () => REAL_SAMPLE });
  const rows = await cbuProvider.fetchLatest();
  assert.equal(rows.length, 3);
  const usd = rows.find((r) => r.currency === 'USD');
  assert.equal(usd.rate, 11839.59);
  assert.equal(usd.dayKey, '2026-09-19');
  const idr = rows.find((r) => r.currency === 'IDR');
  assert.ok(Math.abs(idr.rate - 0.668) < 1e-9, 'Nominal=10 boʻlsa, 1 birlikka boʻlinishi kerak');
});

test('fetchLatest: HTTP xato boʻlsa aniq xabar bilan tashlaydi', async () => {
  respond = () => ({ ok: false, status: 403 });
  await assert.rejects(() => cbuProvider.fetchLatest(), /403/);
});

test('fetchLatest: massiv boʻlmagan javobni rad etadi', async () => {
  respond = () => ({ ok: true, json: async () => ({ error: 'nimadir' }) });
  await assert.rejects(() => cbuProvider.fetchLatest());
});

test('fetchForDate: soʻralgan sanaga mos javobni qabul qiladi', async () => {
  respond = () => ({ ok: true, json: async () => [{ ...REAL_SAMPLE[0], Date: '15.09.2026' }] });
  const result = await cbuProvider.fetchForDate('2026-09-15');
  assert.equal(result.dayKey, '2026-09-15');
  assert.equal(result.rates[0].rate, 11839.59);
  assert.ok(lastUrl.includes('/all/2026-09-15/'));
});

test('fetchForDate: dam olish kuni uchun bir necha kun oldingi sana qabul qilinadi', async () => {
  respond = () => ({ ok: true, json: async () => [{ ...REAL_SAMPLE[0], Date: '18.09.2026' }] }); // Juma, 20 dan 2 kun oldin
  const result = await cbuProvider.fetchForDate('2026-09-20');
  assert.equal(result.dayKey, '2026-09-18');
});

test('fetchForDate: sana parametri eʼtiborsiz qoldirilib, "bugun" qaytarilsa, null qaytaradi', async () => {
  // 2026-08-01 soʻraldi, lekin server "bugun" (2026-09-22) ni qaytardi -> ishonchsiz
  respond = () => ({ ok: true, json: async () => [{ ...REAL_SAMPLE[0], Date: '22.09.2026' }] });
  const result = await cbuProvider.fetchForDate('2026-08-01');
  assert.equal(result, null);
});

test('fetchForDate: boʻsh javobda null qaytaradi (xato tashlamaydi)', async () => {
  respond = () => ({ ok: true, json: async () => [] });
  assert.equal(await cbuProvider.fetchForDate('2026-09-15'), null);
});
