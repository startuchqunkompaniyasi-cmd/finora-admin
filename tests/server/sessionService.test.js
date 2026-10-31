/**
 * tests/server/sessionService.test.js
 * Har test createTestDb() bilan toʻliq izolyatsiyalangan xotiradagi (:memory:) bazada ishlaydi —
 * real serverga yoki fayl tizimiga hech qanday taʼsir qilmaydi.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/database/db.js';
import { createSessionsRepository } from '../../server/repositories/sessionsRepository.js';
import { createSessionService } from '../../server/services/sessionService.js';
import { createHash } from 'node:crypto';

function setup(options = {}) {
  const db = createTestDb();
  const sessionsRepository = createSessionsRepository(db);
  const service = createSessionService({ sessionsRepository, sessionTtlDays: 30, ...options });
  return { db, sessionsRepository, ...service };
}

function insertUser(db, id = 'u1') {
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'Test', `${id}@test.uz`, 'x', now, now);
}

test('createSession + resolveSession: toʻgʻri token userId ni qaytaradi', () => {
  const { db, createSession, resolveSession } = setup();
  insertUser(db);
  const { token } = createSession('u1', 'test-agent');
  assert.equal(resolveSession(token), 'u1');
});

test('resolveSession: notoʻgʻri yoki boʻsh token null qaytaradi', () => {
  const { resolveSession } = setup();
  assert.equal(resolveSession('notogri-token'), null);
  assert.equal(resolveSession(null), null);
  assert.equal(resolveSession(undefined), null);
  assert.equal(resolveSession(''), null);
});

test('destroySession: keyin resolveSession null qaytaradi', () => {
  const { db, createSession, destroySession, resolveSession } = setup();
  insertUser(db);
  const { token } = createSession('u1');
  assert.equal(resolveSession(token), 'u1');
  destroySession(token);
  assert.equal(resolveSession(token), null);
});

test('muddati oʻtgan sessiya rad etiladi', () => {
  const { db, sessionsRepository, resolveSession } = setup();
  insertUser(db);
  const token = 'eski-token';
  sessionsRepository.create({ userId: 'u1', tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: '2020-01-01T00:00:00.000Z' });
  assert.equal(resolveSession(token), null);
});

test('bazada faqat token xeshi saqlanadi, xom token yoʻq', () => {
  const { db, createSession } = setup();
  insertUser(db);
  const { token } = createSession('u1');
  const row = db.prepare('SELECT token_hash FROM sessions').get();
  assert.notEqual(row.token_hash, token);
  assert.equal(row.token_hash.length, 64, 'SHA-256 hex = 64 belgi');
});

test('deleteExpiredSessions: faqat muddati oʻtganlarni oʻchiradi', () => {
  const { db, sessionsRepository, createSession, deleteExpiredSessions, resolveSession } = setup();
  insertUser(db);
  const activeToken = createSession('u1').token;
  const expiredToken = 'eski-token-2';
  sessionsRepository.create({ userId: 'u1', tokenHash: createHash('sha256').update(expiredToken).digest('hex'), expiresAt: '2020-01-01T00:00:00.000Z' });

  deleteExpiredSessions();
  assert.equal(resolveSession(activeToken), 'u1', 'faol sessiya qoladi');
  assert.equal(resolveSession(expiredToken), null, 'eskisi allaqachon rad etilgan edi');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1, 'eskisi bazadan haqiqatan oʻchirilgan');
});

test('cookieOptions: sozlangan TTL va xavfsizlik bayrogʻini aks ettiradi', () => {
  const { cookieOptions } = setup({ sessionTtlDays: 7, cookieSecure: true });
  const options = cookieOptions();
  assert.equal(options.maxAge, 7 * 86_400_000);
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
});
