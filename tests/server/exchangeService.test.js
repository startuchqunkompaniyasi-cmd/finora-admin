/**
 * tests/server/exchangeService.test.js
 * Tarmoqsiz sinov: har test createExchangeStore(vaqtinchalik fayl) + soxta CBU provayder bilan
 * toʻliq izolyatsiyalangan servis nusxasini quradi. Hech qanday tashqi tarmoq yoki mock kutubxonasi
 * kerak emas (server/services/exchangeService.js dagi createExchangeService fabrikasi orqali).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createExchangeStore } from '../../server/services/exchangeStore.js';
import { createExchangeService } from '../../server/services/exchangeService.js';

async function withService(cbuImpl, run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'finora-exchange-'));
  const store = createExchangeStore(path.join(dir, 'rates.json'));
  const service = createExchangeService({ cbuProvider: cbuImpl, store, timezone: 'Asia/Tashkent' });
  try {
    await run({ service, store });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const failingCbu = { async fetchLatest() { throw new Error('CBU HTTP 403'); }, async fetchForDate() { return null; } };
const NOW = new Date('2026-09-22T06:00:00Z'); // Toshkentda 22-sentabr, 11:00

test('CBU ishlayotganda: bugungi kurs olinadi va keshga yoziladi', async () => {
  const cbu = { async fetchLatest() { return [{ currency: 'USD', rate: 12200, dayKey: '2026-09-22' }]; }, async fetchForDate() { return null; } };
  await withService(cbu, async ({ service, store }) => {
    const snapshot = await service.getSnapshot({ now: NOW });
    assert.equal(snapshot.rate, 12200);
    assert.equal(snapshot.source, 'cbu');
    assert.equal(snapshot.demo, false);
    assert.equal(snapshot.stale, false);
    assert.equal((await store.get('USD_UZS', '2026-09-22')).rate, 12200, 'keshga yozilgan boʻlishi kerak');
  });
});

test('CBU ishlamasa, lekin eski maʼlum kurs bor boʻlsa: stale=true bilan qaytadi', async () => {
  await withService(failingCbu, async ({ service, store }) => {
    await store.set('USD_UZS', '2026-09-18', { rate: 12100, source: 'cbu' });
    const snapshot = await service.getSnapshot({ now: NOW });
    assert.equal(snapshot.rate, 12100);
    assert.equal(snapshot.stale, true);
    assert.equal(snapshot.demo, false);
    assert.equal(snapshot.dayKey, '2026-09-18');
  });
});

test('CBU ishlamasa va kesh boʻsh boʻlsa: demo bilan qaytadi, hech qachon xato tashlamaydi', async () => {
  await withService(failingCbu, async ({ service }) => {
    const snapshot = await service.getSnapshot({ now: NOW });
    assert.equal(snapshot.source, 'demo');
    assert.equal(snapshot.demo, true);
    assert.ok(snapshot.rate > 0);
    assert.equal(snapshot.history.length, 30);
  });
});

test('getHistory: keshda toʻliq diapazon boʻlsa, demo ishlatilmaydi va boʻshliqlar oldingi kun bilan toʻldiriladi', async () => {
  await withService(failingCbu, async ({ service, store }) => {
    await store.set('USD_UZS', '2026-09-15', { rate: 12000, source: 'cbu' });
    // 09-16 va 09-17 boʻsh: dam olish kunlari kabi oldingi kundan toʻldirilishi kerak
    await store.set('USD_UZS', '2026-09-18', { rate: 12050, source: 'cbu' });
    await store.set('USD_UZS', '2026-09-19', { rate: 12080, source: 'cbu' });
    await store.set('USD_UZS', '2026-09-20', { rate: 12080, source: 'cbu' });

    const points = await service.getHistory({ fromKey: '2026-09-15', toKey: '2026-09-20', now: NOW, allowLiveFetch: false });
    assert.equal(points.length, 6);
    assert.deepEqual(points.map((p) => p.rate), [12000, 12000, 12000, 12050, 12080, 12080]);
    assert.ok(points.every((p) => !p.demo));
  });
});

test('getHistory: kesh deyarli boʻsh boʻlsa, butun diapazon demo bilan (ochiq belgilangan) toʻldiriladi', async () => {
  await withService(failingCbu, async ({ service }) => {
    const points = await service.getHistory({ fromKey: '2026-08-01', toKey: '2026-09-20', now: NOW, allowLiveFetch: false });
    assert.equal(points.length, 51);
    assert.ok(points.every((p) => p.demo === true), 'har bir nuqta demo deb belgilangan boʻlishi kerak');
  });
});

test('getRate: UZS -> USD teskari kursni toʻgʻri hisoblaydi', async () => {
  const cbu = { async fetchLatest() { return [{ currency: 'USD', rate: 12500, dayKey: '2026-09-22' }]; }, async fetchForDate() { return null; } };
  await withService(cbu, async ({ service }) => {
    const usdToUzs = await service.getRate('USD', 'UZS');
    const uzsToUsd = await service.getRate('UZS', 'USD');
    assert.equal(usdToUzs.rate, 12500);
    assert.ok(Math.abs(uzsToUsd.rate - 1 / 12500) < 1e-12);
    assert.deepEqual(await service.getRate('UZS', 'UZS'), { rate: 1, source: 'identity' });
  });
});

test('CBU tarmoq bilan ishlaydi (tayyor eksport): singleton yaratiladi va xato tashlamaydi', async () => {
  const { getSnapshot } = await import('../../server/services/exchangeService.js');
  const snapshot = await getSnapshot({ now: NOW });
  assert.ok(snapshot.rate > 0);
  assert.ok(['cbu', 'demo', 'secondary'].includes(snapshot.source));
});
