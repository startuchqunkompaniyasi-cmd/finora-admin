/**
 * tests/server/dataApi.test.js
 * Haqiqiy HTTP integratsiya testi: tranzaksiya/byudjet/maqsad CRUD, himoya (auth talab qilinishi),
 * server-tomonidagi shakl tekshiruvi, foydalanuvchilar orasida izolyatsiya, import endpointi va
 * byudjet dublikatining toza 409 bilan rad etilishi (PHASE 9).
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHttpClient } from './helpers/httpClient.js';
import { __resetRateLimiterStateForTests } from '../../server/middleware/rateLimit.js';

let server;
let baseUrl;
let tmpDir;

before(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'finora-data-'));
  process.env.DATABASE_PATH = path.join(tmpDir, 'test.db');
  const { createApp } = await import('../../server/app.js');
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.DATABASE_PATH;
  await rm(tmpDir, { recursive: true, force: true });
});

/** Yangi mijoz yaratadi (CSRF cookie bilan) va berilgan email ostida roʻyxatdan oʻtkazadi. */
async function registeredClient(email) {
  __resetRateLimiterStateForTests();
  const client = createHttpClient(baseUrl);
  await client.get('/api/v1/auth/me'); // CSRF cookie'ni brauzerdagidek oldindan oladi
  await client.post('/api/v1/auth/register', { name: 'Test', email, password: 'parol1234' });
  return client;
}

const sampleTx = { type: 'expense', amount: 45000, currency: 'UZS', categoryId: 'food', description: 'Tushlik', paymentMethod: 'cash', occurredAt: '2026-09-20T07:00:00.000Z' };

test('himoyasiz soʻrov: 401 (hisobga kirish talab qilinadi)', async () => {
  __resetRateLimiterStateForTests();
  const client = createHttpClient(baseUrl);
  const res = await client.get('/api/v1/transactions');
  assert.equal(res.status, 401);
});

test('tranzaksiya: yaratish, roʻyxatda koʻrinishi, yangilash, oʻchirish', async () => {
  const client = await registeredClient('tx1@test.uz');

  const created = await client.post('/api/v1/transactions', sampleTx);
  assert.equal(created.status, 201);
  const tx = (await created.json()).data;
  assert.equal(tx.amount, 45000);
  assert.equal(tx.description, 'Tushlik');
  assert.ok(tx.id);

  const list = await (await client.get('/api/v1/transactions')).json();
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].id, tx.id);

  const updated = await client.patch(`/api/v1/transactions/${tx.id}`, { amount: 50000, description: 'Yangilangan' });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).data.amount, 50000);

  const deleted = await client.delete(`/api/v1/transactions/${tx.id}`);
  assert.equal(deleted.status, 204);
  const afterDelete = await (await client.get('/api/v1/transactions')).json();
  assert.equal(afterDelete.data.length, 0);
});

test('tranzaksiya: notoʻgʻri shakl 400 bilan rad etiladi', async () => {
  const client = await registeredClient('tx2@test.uz');
  const bad = await client.post('/api/v1/transactions', { ...sampleTx, type: 'notogri' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error.field, 'type');

  const negative = await client.post('/api/v1/transactions', { ...sampleTx, amount: -5 });
  assert.equal(negative.status, 400);
});

test('mavjud boʻlmagan tranzaksiyani yangilash/oʻchirish 404/xatosiz', async () => {
  const client = await registeredClient('tx3@test.uz');
  const res = await client.patch('/api/v1/transactions/yoq-id', { amount: 1000 });
  assert.equal(res.status, 404);
});

test('foydalanuvchilar orasida izolyatsiya: boshqa hisobning tranzaksiyasi koʻrinmaydi', async () => {
  const clientA = await registeredClient('userA@test.uz');
  const clientB = await registeredClient('userB@test.uz');
  await clientA.post('/api/v1/transactions', sampleTx);

  const listA = await (await clientA.get('/api/v1/transactions')).json();
  const listB = await (await clientB.get('/api/v1/transactions')).json();
  assert.equal(listA.data.length, 1);
  assert.equal(listB.data.length, 0, 'B hisobi A ning tranzaksiyasini koʻrmasligi kerak');

  // B, A ning tranzaksiyasini ID orqali ham yangilay olmaydi.
  const forbidden = await clientB.patch(`/api/v1/transactions/${listA.data[0].id}`, { amount: 1 });
  assert.equal(forbidden.status, 404, 'boshqa hisobning yozuvi "topilmadi" boʻlishi kerak, ruxsat xatosi emas');
});

test('byudjet: yaratish va dublikat (bir xil kategoriya+davr) toza 409 bilan rad etiladi', async () => {
  const client = await registeredClient('budget1@test.uz');
  const created = await client.post('/api/v1/budgets', { categoryId: 'food', period: 'monthly', limitAmount: 1000000 });
  assert.equal(created.status, 201);

  // Klient odatda buni oldindan tekshiradi (shared/validators), lekin server ham DB UNIQUE
  // orqali himoyalangan — endi (9-bosqich) bu xomaki 500 emas, toza 409 CONFLICT.
  const duplicate = await client.post('/api/v1/budgets', { categoryId: 'food', period: 'monthly', limitAmount: 500000 });
  assert.equal(duplicate.status, 409);
  const body = await duplicate.json();
  assert.equal(body.error.code, 'CONFLICT');
  assert.match(body.error.message, /oylik/, "xabarda davr so'zi (masalan 'oylik') bo'lishi kerak");

  const health = await client.get('/api/v1/health');
  assert.equal(health.status, 200, 'server ishlashda davom etadi');
});

test('maqsad: yaratish, hissa qoʻshish (PATCH bilan currentAmount), oʻchirish', async () => {
  const client = await registeredClient('goal1@test.uz');
  const created = await client.post('/api/v1/goals', { name: 'Noutbuk', targetAmount: 10000000, currentAmount: 0 });
  assert.equal(created.status, 201);
  const goal = (await created.json()).data;

  const updated = await client.patch(`/api/v1/goals/${goal.id}`, { currentAmount: 5000000 });
  assert.equal((await updated.json()).data.currentAmount, 5000000);

  await client.delete(`/api/v1/goals/${goal.id}`);
  const list = await (await client.get('/api/v1/goals')).json();
  assert.equal(list.data.length, 0);
});

test('profil: GET sukut qiymatlarni, PATCH oʻzgarishlarni qaytaradi', async () => {
  const client = await registeredClient('profile1@test.uz');
  const initial = await (await client.get('/api/v1/profile')).json();
  assert.equal(initial.data.baseCurrency, 'UZS');
  assert.equal(initial.data.openingBalance, 0);

  const updated = await client.patch('/api/v1/profile', { openingBalance: 250000, baseCurrency: 'USD' });
  const data = (await updated.json()).data;
  assert.equal(data.openingBalance, 250000);
  assert.equal(data.baseCurrency, 'USD');

  // Ruxsat etilmagan maydon (masalan toʻgʻridan-toʻgʻri "plan") eʼtiborsiz qoldiriladi.
  const rejected = await client.patch('/api/v1/profile', { plan: 'mega', id: 'hack' });
  assert.equal((await rejected.json()).data.plan, 'free', 'ochiq ruxsat berilmagan maydon oʻzgarmasligi kerak');
});

test('import: tranzaksiya, byudjet, maqsad va profilni bir yoʻla koʻchiradi', async () => {
  const client = await registeredClient('import1@test.uz');
  const res = await client.post('/api/v1/import', {
    transactions: [sampleTx, { ...sampleTx, type: 'income', categoryId: 'salary', amount: 5000000 }],
    budgets: [{ categoryId: 'food', period: 'monthly', limitAmount: 1000000 }],
    goals: [{ name: 'Zaxira', targetAmount: 2000000, currentAmount: 500000 }],
    profile: { baseCurrency: 'UZS', openingBalance: 100000, onboardedAt: '2026-09-01T00:00:00.000Z' },
  });
  assert.equal(res.status, 200);
  const summary = (await res.json()).data;
  assert.deepEqual(summary, { transactions: 2, budgets: 1, goals: 1 });

  const [txList, budgetList, goalList, profile] = await Promise.all([
    client.get('/api/v1/transactions').then((r) => r.json()),
    client.get('/api/v1/budgets').then((r) => r.json()),
    client.get('/api/v1/goals').then((r) => r.json()),
    client.get('/api/v1/profile').then((r) => r.json()),
  ]);
  assert.equal(txList.data.length, 2);
  assert.equal(budgetList.data.length, 1);
  assert.equal(goalList.data.length, 1);
  assert.equal(profile.data.openingBalance, 100000);
  assert.equal(profile.data.onboardedAt, '2026-09-01T00:00:00.000Z');
});

test('import: notoʻgʻri yozuv bilan butun soʻrov rad etiladi (yarim import qilinmaydi)', async () => {
  const client = await registeredClient('import2@test.uz');
  const res = await client.post('/api/v1/import', { transactions: [sampleTx, { ...sampleTx, amount: -1 }], budgets: [], goals: [] });
  assert.equal(res.status, 400);

  const list = await (await client.get('/api/v1/transactions')).json();
  assert.equal(list.data.length, 0, 'notoʻgʻri yozuv bilan birga toʻgʻrisi ham yozilmasligi kerak');
});

test('import: ichida dublikat byudjet boʻlsa, 409 va HECH NARSA yozilmaydi (atomiklik)', async () => {
  const client = await registeredClient('import3@test.uz');
  // Avvaldan "food/monthly" byudjeti mavjud.
  await client.post('/api/v1/budgets', { categoryId: 'food', period: 'monthly', limitAmount: 1000000 });

  // Shu importda bir nechta to'g'ri tranzaksiya BOR, lekin byudjet o'sha (food/monthly) bilan
  // to'qnashadi — butun import (tranzaksiyalar HAM) bekor bo'lishi kerak.
  const res = await client.post('/api/v1/import', {
    transactions: [sampleTx, { ...sampleTx, type: 'income', categoryId: 'salary', amount: 1000000 }],
    budgets: [{ categoryId: 'food', period: 'monthly', limitAmount: 777000 }],
    goals: [],
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error.code, 'CONFLICT');

  const txList = await (await client.get('/api/v1/transactions')).json();
  assert.equal(txList.data.length, 0, 'importdagi tranzaksiyalar ham yozilmagan bo\'lishi kerak (hammasi yoki hech narsa)');

  const budgetList = await (await client.get('/api/v1/budgets')).json();
  assert.equal(budgetList.data.length, 1, 'faqat importdan OLDIN mavjud bo\'lgan byudjet qolishi kerak');
});

test('kategoriyalar: hozircha doim boʻsh roʻyxat (custom kategoriya UI hali yoʻq)', async () => {
  const client = await registeredClient('cat1@test.uz');
  const res = await (await client.get('/api/v1/categories')).json();
  assert.deepEqual(res.data, []);
});

test('tranzaksiya: ?limit/?offset sahifalash (PHASE 10, ixtiyoriy — berilmasa eski xatti-harakat)', async () => {
  const client = await registeredClient('page1@test.uz');
  for (let i = 0; i < 5; i += 1) {
    await client.post('/api/v1/transactions', { ...sampleTx, occurredAt: `2026-09-${10 + i}T07:00:00.000Z`, description: `tx${i}` });
  }

  const full = await (await client.get('/api/v1/transactions')).json();
  assert.equal(full.data.length, 5);
  assert.equal(full.meta, undefined, 'limit berilmasa meta boʻlmasligi kerak (eski shartnoma buzilmaydi)');

  const page1 = await (await client.get('/api/v1/transactions?limit=2&offset=0')).json();
  assert.equal(page1.data.length, 2);
  assert.deepEqual(page1.meta, { total: 5, limit: 2, offset: 0 });
  // Eng yangi sana birinchi (ORDER BY occurred_at DESC).
  assert.equal(page1.data[0].description, 'tx4');

  const page2 = await (await client.get('/api/v1/transactions?limit=2&offset=2')).json();
  assert.equal(page2.data.length, 2);
  assert.equal(page2.data[0].description, 'tx2');
});
