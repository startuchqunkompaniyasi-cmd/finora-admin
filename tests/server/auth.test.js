/**
 * tests/server/auth.test.js
 * Haqiqiy HTTP integratsiya testi: `createApp()` bilan yasalgan Express ilovasi ochiq portda
 * ishga tushiriladi (vaqtinchalik bazaga ulanish uchun DATABASE_PATH ni testga xos qilib
 * sozlaymiz). Har test oʻzining mijozini (`createHttpClient`) oladi — u sessiya VA CSRF
 * cookie'larini xuddi brauzer kabi avtomatik boshqaradi (tests/server/helpers/httpClient.js).
 */

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHttpClient } from './helpers/httpClient.js';
import { __resetRateLimiterStateForTests } from '../../server/middleware/rateLimit.js';

let server;
let baseUrl;
let tmpDir;
let client;

before(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'finora-auth-'));
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

beforeEach(async () => {
  __resetRateLimiterStateForTests();
  client = createHttpClient(baseUrl);
  // Haqiqiy brauzerda bu birinchi GET /me chaqiruvi orqali sodir boʻladi (ilova ochilganda) —
  // shu soʻrov CSRF cookie'sini oʻrnatadi, shundan keyingina POST/PATCH/DELETE ruxsat beriladi.
  await client.get('/api/v1/auth/me');
});

test('roʻyxatdan oʻtish: 201, foydalanuvchi qaytadi, sessiya cookie oʻrnatiladi', async () => {
  const res = await client.post('/api/v1/auth/register', { name: 'Ali Valiyev', email: 'ali1@test.uz', password: 'parol1234' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.data.user.email, 'ali1@test.uz');
  assert.equal(body.data.user.name, 'Ali Valiyev');
  assert.ok(!('password' in body.data.user) && !('passwordHash' in body.data.user), 'parol hech qachon qaytmasin');
  assert.ok(client.hasCookie('finora_session'), 'sessiya cookie boʻlishi kerak');
});

test('email kichik harfga oʻtkaziladi va normallashtiriladi', async () => {
  const res = await client.post('/api/v1/auth/register', { name: 'Vali', email: '  Vali@TEST.uz  ', password: 'parol1234' });
  const body = await res.json();
  assert.equal(body.data.user.email, 'vali@test.uz');
});

test('dublikat email: 409, umumiy xato kodi', async () => {
  await client.post('/api/v1/auth/register', { name: 'Birinchi', email: 'dublikat@test.uz', password: 'parol1234' });
  const res = await client.post('/api/v1/auth/register', { name: 'Ikkinchi', email: 'DUBLIKAT@test.uz', password: 'boshqa12345' });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error.code, 'EMAIL_TAKEN');
});

test('validatsiya: qisqa parol va notoʻgʻri email rad etiladi (422)', async () => {
  const shortPw = await client.post('/api/v1/auth/register', { name: 'A', email: 'qisqa@test.uz', password: '123' });
  assert.equal(shortPw.status, 422);
  assert.equal((await shortPw.json()).error.field, 'password');

  const badEmail = await client.post('/api/v1/auth/register', { name: 'A', email: 'notogri-email', password: 'parol1234' });
  assert.equal(badEmail.status, 422);
  assert.equal((await badEmail.json()).error.field, 'email');
});

test('kirish: toʻgʻri maʼlumot bilan 200 va cookie', async () => {
  await client.post('/api/v1/auth/register', { name: 'Kirish Testi', email: 'login1@test.uz', password: 'parol1234' });
  client.clearCookies();
  await client.get('/api/v1/auth/me'); // yangi CSRF cookie
  const res = await client.post('/api/v1/auth/login', { email: 'LOGIN1@test.uz', password: 'parol1234' });
  assert.equal(res.status, 200);
  assert.ok(client.hasCookie('finora_session'));
});

test('kirish: notoʻgʻri parol va mavjud boʻlmagan email BIR XIL xabar bilan rad etiladi (401)', async () => {
  await client.post('/api/v1/auth/register', { name: 'X', email: 'mavjud@test.uz', password: 'parol1234' });
  const wrongPw = await client.post('/api/v1/auth/login', { email: 'mavjud@test.uz', password: 'notogri' });
  const noUser = await client.post('/api/v1/auth/login', { email: 'yoq@test.uz', password: 'notogri' });
  assert.equal(wrongPw.status, 401);
  assert.equal(noUser.status, 401);
  const [a, b] = await Promise.all([wrongPw.json(), noUser.json()]);
  assert.equal(a.error.message, b.error.message, 'foydalanuvchi mavjudligini bilib boʻlmasligi kerak');
});

test('/me: cookie yoʻq boʻlsa user:null (401 emas)', async () => {
  client.clearCookies();
  const res = await client.get('/api/v1/auth/me');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.user, null);
});

test('/me: haqiqiy sessiya bilan foydalanuvchini qaytaradi', async () => {
  await client.post('/api/v1/auth/register', { name: 'Men Kim', email: 'me1@test.uz', password: 'parol1234' });
  const res = await client.get('/api/v1/auth/me');
  assert.equal((await res.json()).data.user.email, 'me1@test.uz');
});

test('chiqish: cookie bekor qilinadi, keyin /me user:null qaytaradi', async () => {
  await client.post('/api/v1/auth/register', { name: 'Chiqish', email: 'logout1@test.uz', password: 'parol1234' });

  const logoutRes = await client.post('/api/v1/auth/logout', {});
  assert.equal(logoutRes.status, 200);
  const rawSetCookie = logoutRes.headers.getSetCookie().find((c) => c.startsWith('finora_session='));
  assert.match(rawSetCookie, /Max-Age=0/, 'cookie darhol muddati tugagan qilib belgilanishi kerak');

  const me = await client.get('/api/v1/auth/me');
  assert.equal((await me.json()).data.user, null);
});

test('chiqish: sessiyasiz soʻrov 401 qaytaradi', async () => {
  const res = await client.post('/api/v1/auth/logout', {});
  assert.equal(res.status, 401);
});

test('notoʻgʻri JSON tanasi: 400, server yiqilmaydi', async () => {
  const res = await client.rawFetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': client.getCookie('finora_csrf') ?? '', Cookie: `finora_csrf=${client.getCookie('finora_csrf') ?? ''}` },
    body: '{buzilgan',
  });
  assert.equal(res.status, 400);
  const health = await client.get('/api/v1/health');
  assert.equal(health.status, 200, 'server ishlashda davom etadi');
});

test('CSRF: tokensiz POST 403 bilan rad etiladi', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // na cookie, na CSRF sarlavha yoʻq
    body: JSON.stringify({ name: 'Yoʻq', email: 'csrfyoq@test.uz', password: 'parol1234' }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, 'CSRF_INVALID');
});

test('tezlik cheklovi: ketma-ket koʻp login urinishidan soʻng 429 qaytaradi', async () => {
  await client.post('/api/v1/auth/register', { name: 'Limit', email: 'limit@test.uz', password: 'parol1234' });
  let last;
  for (let i = 0; i < 12; i += 1) {
    last = await client.post('/api/v1/auth/login', { email: 'limit@test.uz', password: 'notogri' });
  }
  assert.equal(last.status, 429);
  const body = await last.json();
  assert.equal(body.error.code, 'TOO_MANY_REQUESTS');
});
