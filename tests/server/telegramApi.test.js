/**
 * Tarif ommaviy API + Telegram ulash endpointlari (HTTP).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHttpClient } from './helpers/httpClient.js';
import { __resetRateLimiterStateForTests } from '../../server/middleware/rateLimit.js';

let server, baseUrl, tmpDir;

before(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'finora-tg-'));
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

async function registered(email) {
  __resetRateLimiterStateForTests();
  const client = createHttpClient(baseUrl);
  await client.get('/api/v1/auth/me');
  await client.post('/api/v1/auth/register', { name: 'Test', email, password: 'parol1234' });
  return client;
}

test('ommaviy tariflar: mehmonga ochiq, narx bazadan keladi, ichki maydonlar yoʻq', async () => {
  const res = await createHttpClient(baseUrl).get('/api/v1/public/tariffs');
  assert.equal(res.status, 200);
  const { tariffs } = (await res.json()).data;
  assert.deepEqual(tariffs.map((t) => t.id), ['free', 'premium', 'mega']);
  assert.ok(!('subscribers' in tariffs[0]));
  assert.equal(typeof tariffs[1].priceMinor, 'number');
});

test('admin narxni oʻzgartirsa, ommaviy tariflar yangi narxni qaytaradi', async () => {
  const { getDb } = await import('../../server/database/db.js');
  getDb().prepare("UPDATE tariffs SET price_minor = 4900000, name = 'Premium+' WHERE id = 'premium'").run();
  const { tariffs } = (await (await createHttpClient(baseUrl).get('/api/v1/public/tariffs')).json()).data;
  const premium = tariffs.find((t) => t.id === 'premium');
  assert.equal(premium.priceMinor, 4900000);
  assert.equal(premium.name, 'Premium+');
});

test('nofaol tarif ommaviy roʻyxatda yoʻq, lekin foydalanuvchining oʻz tarifi koʻrinadi', async () => {
  const client = await registered('tariff@test.uz');
  const { getDb } = await import('../../server/database/db.js');
  getDb().prepare("UPDATE users SET plan = 'mega' WHERE email = 'tariff@test.uz'").run();
  getDb().prepare("UPDATE tariffs SET is_active = 0 WHERE id = 'mega'").run();
  const guest = (await (await createHttpClient(baseUrl).get('/api/v1/public/tariffs')).json()).data;
  assert.ok(!guest.tariffs.some((t) => t.id === 'mega'));
  const mine = (await (await client.get('/api/v1/public/tariffs')).json()).data;
  assert.equal(mine.currentPlan, 'mega');
  assert.ok(mine.tariffs.some((t) => t.id === 'mega'));
});

test('telegram: mehmon 401; bot oʻchiq boʻlsa holat enabled=false, ulash 503', async () => {
  assert.equal((await createHttpClient(baseUrl).get('/api/v1/telegram/status')).status, 401);
  const client = await registered('tg@test.uz');
  const status = (await (await client.get('/api/v1/telegram/status')).json()).data;
  assert.equal(status.enabled, false);
  assert.equal(status.linked, false);
  assert.equal((await client.post('/api/v1/telegram/link', {})).status, 503);
});

test('telegram: bot yoqilganda ulash havolasi beriladi', async () => {
  const { telegramRuntime } = await import('../../server/services/telegramRuntime.js');
  telegramRuntime.enabled = true;
  telegramRuntime.username = 'finora_test_bot';
  try {
    const client = await registered('tg2@test.uz');
    const res = await client.post('/api/v1/telegram/link', {});
    assert.equal(res.status, 201);
    assert.match((await res.json()).data.url, /^https:\/\/t\.me\/finora_test_bot\?start=[A-Z2-9]{8}$/);
  } finally {
    telegramRuntime.enabled = false;
    telegramRuntime.username = null;
  }
});
