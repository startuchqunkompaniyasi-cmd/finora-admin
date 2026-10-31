/**
 * tests/server/admin.test.js
 * Admin backend: parol siyosati, bootstrap, kirish va bloklash, sessiya muddati, RBAC middleware,
 * audit (append-only), foydalanuvchi/tarif/sozlama amallari, CSV xavfsizligi.
 *
 * Express'ga bogʻliq EMAS: handlerlar soxta req/res bilan, xotiradagi bazada (createTestDb) chaqiriladi.
 * (Express marshrutlarini haqiqiy HTTP orqali tekshiradigan test: tests/server/adminApi.test.js.)
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/database/db.js';
import { hashPassword, verifyPassword } from '../../server/services/passwordService.js';
import { checkAdminPassword, checkAdminUsername } from '../../server/services/adminPasswordPolicy.js';
import { createAdminAuthService, bootstrapAdmin, ADMIN_COOKIE_NAME } from '../../server/services/adminAuthService.js';
import { createAdminsRepository } from '../../server/repositories/adminsRepository.js';
import { createAuditRepository, sanitizeDetails } from '../../server/repositories/auditRepository.js';
import { createAdminDataRepository } from '../../server/repositories/adminDataRepository.js';
import { createTariffsRepository } from '../../server/repositories/tariffsRepository.js';
import { createSettingsRepository } from '../../server/repositories/settingsRepository.js';
import { createUsersRepository } from '../../server/repositories/usersRepository.js';
import { createSessionsRepository } from '../../server/repositories/sessionsRepository.js';
import { createAdminHandlers } from '../../server/controllers/adminHandlers.js';
import { createAdminMiddleware } from '../../server/middleware/adminAuth.js';

const CONFIG = { sessionTtlHours: 8, idleTimeoutMinutes: 60, maxFailedAttempts: 3, lockMinutes: 15 };
const silentLog = { log() {}, warn() {}, error() {} };

let db, repos, auth, handlers, mw, usersRepo;

async function setup({ enforcePasswordChange = false } = {}) {
  db = createTestDb();
  const adminsRepository = createAdminsRepository(db);
  const auditRepository = createAuditRepository(db);
  const dataRepository = createAdminDataRepository(db);
  const tariffsRepository = createTariffsRepository(db);
  const settingsRepository = createSettingsRepository(db);
  tariffsRepository.ensureSeeded();
  repos = { adminsRepository, auditRepository, dataRepository, tariffsRepository, settingsRepository };
  auth = createAdminAuthService({ adminsRepository, hashPassword, verifyPassword, config: CONFIG });
  handlers = createAdminHandlers({ ...repos, adminAuthService: auth, cookieConfig: { secure: false, ttlMs: 1000 } });
  mw = createAdminMiddleware({ adminAuthService: auth, enforcePasswordChange });
  usersRepo = createUsersRepository(db);
  await bootstrapAdmin({ adminsRepository, hashPassword, adminEnv: { bootstrapUsername: 'uchqun', bootstrapPassword: '7000' }, isProduction: false, log: silentLog });
}

function call(handler, { body, query = {}, params = {}, admin = null, sessionId = 's1', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(name, value) { this.headers[name] = value; },
      json(payload) { resolve({ status: this.statusCode, body: payload, headers: this.headers }); return this; },
      send(payload) { resolve({ status: this.statusCode, text: payload, headers: this.headers }); return this; },
    };
    const req = { body, query, params, admin, adminSessionId: sessionId, ip: '127.0.0.1', headers };
    Promise.resolve(handler(req, res, reject)).catch(reject);
  });
}

async function loginAs(password = '7000') {
  const result = await auth.login({ username: 'uchqun', password, ip: '1.1.1.1', userAgent: 'test' });
  return result;
}
async function adminCtx() {
  const login = await loginAs();
  const resolved = auth.resolveSession(login.token);
  return { admin: resolved.admin, sessionId: resolved.sessionId, token: login.token };
}
function addUser(name, email, extra = {}) {
  const user = usersRepo.create({ name, email, passwordHash: 'x' });
  if (extra.plan) usersRepo.updateSettings(user.id, { plan: extra.plan });
  return user;
}

beforeEach(() => setup());

// ---------- parol siyosati ----------
test('parol siyosati: qisqa, oddiy va logini bor parollar rad etiladi', () => {
  assert.ok(checkAdminPassword('7000'));
  assert.ok(checkAdminPassword('alllowercaseletters'));
  assert.ok(checkAdminPassword('Uchqun-Secret-123', { username: 'uchqun' }));
  assert.ok(checkAdminPassword('Same-Password-123!', { current: 'Same-Password-123!' }));
  assert.equal(checkAdminPassword('Tr0ub4dor-horse-9'), null);
  assert.ok(checkAdminUsername('a b'));
  assert.equal(checkAdminUsername('uchqun'), null);
});

// ---------- bootstrap ----------
test('bootstrap: admin yaratiladi, parol XESH sifatida saqlanadi, majburiy almashtirish belgilanadi', async () => {
  const row = repos.adminsRepository.findByUsernameRaw('uchqun');
  assert.ok(row);
  assert.notEqual(row.password_hash, '7000');
  assert.ok(row.password_hash.startsWith('scrypt:'));
  assert.equal(row.must_change_password, 1);
  const again = await bootstrapAdmin({ adminsRepository: repos.adminsRepository, hashPassword, adminEnv: { bootstrapUsername: 'other', bootstrapPassword: 'x' }, isProduction: false, log: silentLog });
  assert.equal(again.created, false);
  assert.equal(repos.adminsRepository.count(), 1);
});

test('bootstrap: ishlab chiqarishda zaif parol bilan admin YARATILMAYDI', async () => {
  const fresh = createAdminsRepository(createTestDb());
  const result = await bootstrapAdmin({ adminsRepository: fresh, hashPassword, adminEnv: { bootstrapUsername: 'uchqun', bootstrapPassword: '7000' }, isProduction: true, log: silentLog });
  assert.equal(result.created, false);
  assert.equal(fresh.count(), 0);
});

// ---------- kirish ----------
test('login: toʻgʻri parol sessiya beradi; noto‘g‘ri login va noto‘g‘ri parol BIR XIL xabar', async () => {
  const ok = await loginAs();
  assert.equal(ok.ok, true);
  assert.equal(ok.admin.username, 'uchqun');
  assert.equal('passwordHash' in ok.admin, false);

  const badPass = await auth.login({ username: 'uchqun', password: 'wrong', ip: '1' });
  const badUser = await auth.login({ username: 'nobody', password: 'wrong', ip: '1' });
  assert.equal(badPass.message, badUser.message);
  assert.equal(badPass.code, 'INVALID_CREDENTIALS');
});

test('login: sessiya tokeni bazada xom holda saqlanmaydi', async () => {
  const { token } = await loginAs();
  const rows = db.prepare('SELECT token_hash FROM admin_sessions').all();
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, token);
  assert.equal(rows[0].token_hash.length, 64);
});

test('bloklash: ketma-ket xato urinishlardan keyin TOʻGʻRI parol ham vaqtincha rad etiladi', async () => {
  for (let i = 0; i < CONFIG.maxFailedAttempts; i += 1) await auth.login({ username: 'uchqun', password: 'bad', ip: '1' });
  const locked = await loginAs('7000');
  assert.equal(locked.ok, false);
  assert.equal(locked.code, 'LOCKED');
  const events = repos.adminsRepository.recentLogins(10);
  assert.ok(events.some((e) => e.reason === 'locked'));
  assert.ok(events.every((e) => !('password' in e)));
});

test('sessiya: muddati tugagan yoki uzoq harakatsiz sessiya yaroqsiz', async () => {
  const { token } = await adminCtx();
  assert.ok(auth.resolveSession(token));
  db.prepare('UPDATE admin_sessions SET last_seen_at = ?').run(new Date(Date.now() - 2 * 3_600_000).toISOString());
  assert.equal(auth.resolveSession(token), null, 'harakatsizlik');
  const second = await adminCtx();
  db.prepare('UPDATE admin_sessions SET expires_at = ?').run(new Date(Date.now() - 1000).toISOString());
  assert.equal(auth.resolveSession(second.token), null, 'mutlaq muddat');
  assert.equal(auth.resolveSession('garbage'), null);
  assert.equal(auth.resolveSession(undefined), null);
});

// ---------- middleware ----------
function runMiddleware(fn, req) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ blocked: true, status: this.statusCode, body: b }); } };
    fn(req, res, () => resolve({ blocked: false, req }));
  });
}

test('middleware: sessiyasiz soʻrov 401; foydalanuvchi cookie`si admin huquqi bermaydi', async () => {
  const noCookie = { headers: {}, path: '/users' };
  await runMiddleware(mw.attachAdmin, noCookie);
  assert.equal((await runMiddleware(mw.requireAdmin, noCookie)).status, 401);

  const userCookie = { headers: { cookie: 'finora_session=abc123' }, path: '/users' };
  await runMiddleware(mw.attachAdmin, userCookie);
  assert.equal(userCookie.admin, null);
  const forged = { headers: { cookie: `${ADMIN_COOKIE_NAME}=${'a'.repeat(64)}` }, path: '/users' };
  await runMiddleware(mw.attachAdmin, forged);
  assert.equal(forged.admin, null);
});

test('middleware: haqiqiy sessiya oʻtadi; viewer roli yozishga ruxsat olmaydi', async () => {
  const { token, admin } = await adminCtx();
  const req = { headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` }, path: '/users' };
  await runMiddleware(mw.attachAdmin, req);
  assert.equal(req.admin.id, admin.id);
  assert.equal((await runMiddleware(mw.requireAdmin, req)).blocked, false);
  assert.equal((await runMiddleware(mw.requireWrite, req)).blocked, false);
  db.prepare("UPDATE admins SET role = 'viewer'").run();
  const viewerReq = { headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` }, path: '/users' };
  await runMiddleware(mw.attachAdmin, viewerReq);
  assert.equal((await runMiddleware(mw.requireWrite, viewerReq)).status, 403);
});

test('middleware: ishlab chiqarishda parol almashtirilmaguncha boshqa yoʻllar yopiq', async () => {
  await setup({ enforcePasswordChange: true });
  const { token } = await adminCtx();
  const attach = async (path) => { const req = { headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` }, path }; await runMiddleware(mw.attachAdmin, req); return runMiddleware(mw.requireAdmin, req); };
  assert.equal((await attach('/users')).status, 403);
  assert.equal((await attach('/users')).body.error.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await attach('/auth/change-password')).blocked, false);
  assert.equal((await attach('/auth/me')).blocked, false);
});

// ---------- parol/login almashtirish ----------
test('parol almashtirish: joriy parol shart, zaif parol rad, boshqa sessiyalar bekor, eski parol ishlamaydi', async () => {
  const a = await adminCtx();
  const other = await adminCtx(); // ikkinchi qurilma
  const ctx = { admin: a.admin, sessionId: a.sessionId };

  let r = await call(handlers.changePassword, { ...ctx, body: { currentPassword: 'wrong', newPassword: 'Str0ng-Passphrase!', confirmPassword: 'Str0ng-Passphrase!' } });
  assert.equal(r.status, 403);
  r = await call(handlers.changePassword, { ...ctx, body: { currentPassword: '7000', newPassword: '1234', confirmPassword: '1234' } });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'WEAK_PASSWORD');
  r = await call(handlers.changePassword, { ...ctx, body: { currentPassword: '7000', newPassword: 'Str0ng-Passphrase!', confirmPassword: 'different' } });
  assert.equal(r.body.error.code, 'MISMATCH');

  r = await call(handlers.changePassword, { ...ctx, body: { currentPassword: '7000', newPassword: 'Str0ng-Passphrase!', confirmPassword: 'Str0ng-Passphrase!' } });
  assert.equal(r.status, 200);
  assert.ok(auth.resolveSession(a.token), 'joriy sessiya saqlanadi');
  assert.equal(auth.resolveSession(other.token), null, 'boshqa sessiya bekor qilinadi');
  assert.equal((await loginAs('7000')).ok, false);
  assert.equal((await loginAs('Str0ng-Passphrase!')).ok, true);
  assert.equal(repos.adminsRepository.findByUsernameRaw('uchqun').must_change_password, 0);

  const logText = JSON.stringify(repos.auditRepository.list({ pageSize: 100 }).items);
  assert.ok(!logText.includes('Str0ng-Passphrase') && !logText.includes('7000'), 'auditda parol yoʻq');
  assert.ok(repos.auditRepository.list({ pageSize: 100 }).items.some((e) => e.action === 'admin.password_change' && e.result === 'failure'));
});

test('login almashtirish: parol bilan tasdiqlanadi, band/yaroqsiz login rad', async () => {
  const { admin, sessionId } = await adminCtx();
  const ctx = { admin, sessionId };
  assert.equal((await call(handlers.changeUsername, { ...ctx, body: { currentPassword: 'x', username: 'newname' } })).status, 403);
  assert.equal((await call(handlers.changeUsername, { ...ctx, body: { currentPassword: '7000', username: 'a b' } })).status, 422);
  const r = await call(handlers.changeUsername, { ...ctx, body: { currentPassword: '7000', username: 'newname' } });
  assert.equal(r.body.data.admin.username, 'newname');
});

// ---------- audit ----------
test('audit jurnali append-only: UPDATE va DELETE bazaning oʻzida taqiqlangan', async () => {
  const { admin } = await adminCtx();
  repos.auditRepository.append({ admin, action: 'test.action', reason: 'sinov' });
  assert.throws(() => db.prepare("UPDATE audit_log SET action = 'x'").run(), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM audit_log').run(), /append-only/);
});

test('audit: sirli kalitlar avtomatik olib tashlanadi', () => {
  const clean = sanitizeDetails({ before: 'a', password: 'p', nested: { token: 't', passwordHash: 'h', ok: 1 }, list: [{ secret: 1, keep: 2 }] });
  assert.deepEqual(clean, { before: 'a', nested: { ok: 1 }, list: [{ keep: 2 }] });
});

// ---------- foydalanuvchilar ----------
test('foydalanuvchilar: qidiruv, filtr, sahifalash; javobda parol xeshi yoʻq; LIKE belgilari xavfsiz', async () => {
  const { admin } = await adminCtx();
  for (let i = 0; i < 7; i += 1) addUser(`Ali ${i}`, `ali${i}@test.uz`);
  addUser('Vali_Test', 'vali@test.uz');
  let r = await call(handlers.listUsers, { admin, query: { q: 'ali', pageSize: '5' } });
  assert.equal(r.body.data.total, 8);
  assert.equal(r.body.data.items.length, 5);
  assert.ok(!JSON.stringify(r.body).includes('password'));
  r = await call(handlers.listUsers, { admin, query: { q: '%' } });
  assert.equal(r.body.data.total, 0, '% joker sifatida ishlamaydi');
  r = await call(handlers.listUsers, { admin, query: { q: 'vali_t' } });
  assert.equal(r.body.data.total, 1);
  r = await call(handlers.listUsers, { admin, query: { q: "x' OR '1'='1" } });
  assert.equal(r.body.data.total, 0);
});

test('hisobni toʻxtatish: sabab shart, sessiyalar oʻchadi, audit yoziladi, qayta yoqish ishlaydi', async () => {
  const { admin } = await adminCtx();
  const user = addUser('Bobur', 'bobur@test.uz');
  createSessionsRepository(db).create({ userId: user.id, tokenHash: 'h1', expiresAt: new Date(Date.now() + 1e6).toISOString() });

  let r = await call(handlers.setUserStatus, { admin, params: { id: user.id }, body: { status: 'suspended' } });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'REASON_REQUIRED');

  r = await call(handlers.setUserStatus, { admin, params: { id: user.id }, body: { status: 'suspended', reason: 'Spam faoliyati' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.user.status, 'suspended');
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions WHERE user_id = ?').get(user.id).n, 0);
  const entry = repos.auditRepository.list({ action: 'user.suspend' }).items[0];
  assert.equal(entry.entityId, user.id);
  assert.equal(entry.reason, 'Spam faoliyati');
  assert.equal(entry.adminUsername, 'uchqun');

  r = await call(handlers.setUserStatus, { admin, params: { id: user.id }, body: { status: 'suspended', reason: 'yana qayta' } });
  assert.equal(r.status, 409);
  r = await call(handlers.setUserStatus, { admin, params: { id: user.id }, body: { status: 'active', reason: 'Xato bloklangan' } });
  assert.equal(r.body.data.user.status, 'active');
  assert.equal((await call(handlers.setUserStatus, { admin, params: { id: 'nope' }, body: { status: 'active', reason: 'abcdef' } })).status, 404);
});

test('tarif tayinlash: faqat mavjud faol tarif, sabab shart, audit oldin/keyin', async () => {
  const { admin } = await adminCtx();
  const user = addUser('Sardor', 'sardor@test.uz');
  assert.equal((await call(handlers.setUserPlan, { admin, params: { id: user.id }, body: { plan: 'ghost', reason: 'sabab bor' } })).status, 422);
  assert.equal((await call(handlers.setUserPlan, { admin, params: { id: user.id }, body: { plan: 'premium' } })).body.error.code, 'REASON_REQUIRED');
  const r = await call(handlers.setUserPlan, { admin, params: { id: user.id }, body: { plan: 'premium', reason: 'Sovgʻa sifatida' } });
  assert.equal(r.body.data.user.plan, 'premium');
  assert.deepEqual(repos.auditRepository.list({ action: 'user.plan_change' }).items[0].details, { before: 'free', after: 'premium' });
});

test('profilni tahrirlash: email band boʻlsa 409, notoʻgʻri boʻlsa 422', async () => {
  const { admin } = await adminCtx();
  const a = addUser('A', 'a@test.uz');
  addUser('B', 'b@test.uz');
  assert.equal((await call(handlers.updateUser, { admin, params: { id: a.id }, body: { email: 'b@test.uz' } })).status, 409);
  assert.equal((await call(handlers.updateUser, { admin, params: { id: a.id }, body: { email: 'bad' } })).status, 422);
  const r = await call(handlers.updateUser, { admin, params: { id: a.id }, body: { name: 'Yangi Ism' } });
  assert.equal(r.body.data.user.name, 'Yangi Ism');
});

test('foydalanuvchi tafsiloti: balans foydalanuvchi yozuvlaridan hisoblanadi, tavsif/izoh chiqmaydi', async () => {
  const { admin } = await adminCtx();
  const user = addUser('Dilnoza', 'dil@test.uz');
  usersRepo.updateSettings(user.id, { openingBalance: 100_000 });
  const ins = db.prepare("INSERT INTO transactions (id, user_id, type, amount, currency, category_id, description, note, payment_method, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'food', 'MAXFIY TAVSIF', 'MAXFIY IZOH', 'cash', ?, ?, ?)");
  const now = new Date().toISOString();
  ins.run('t1', user.id, 'income', 500_000, 'UZS', now, now, now);
  ins.run('t2', user.id, 'expense', 120_000, 'UZS', now, now, now);
  ins.run('t3', user.id, 'expense', 1_000, 'USD', now, now, now); // kursi yoʻq -> hisobga olinmaydi
  const r = await call(handlers.getUser, { admin, params: { id: user.id } });
  const { balance, usage } = r.body.data.user;
  assert.equal(balance.currentMinor, 100_000 + 500_000 - 120_000);
  assert.equal(balance.unconvertedCount, 1);
  assert.equal(usage.transactions, 3);
  assert.ok(!JSON.stringify(r.body).includes('MAXFIY'));
  const list = await call(handlers.listTransactions, { admin, query: { q: 'dil', type: 'expense' } });
  assert.equal(list.body.data.total, 2);
  assert.ok(!JSON.stringify(list.body).includes('MAXFIY'));
});

test('CSV eksport: formula inyeksiyasi neytrallashtiriladi, audit yoziladi', async () => {
  const { admin } = await adminCtx();
  addUser('=HYPERLINK("http://evil")', 'csv@test.uz');
  addUser('Oddiy, "Ism"', 'csv2@test.uz');
  const r = await call(handlers.exportUsers, { admin, query: {} });
  assert.match(r.headers['Content-Type'], /text\/csv/);
  assert.ok(r.text.includes("'=HYPERLINK"));
  assert.ok(!/(^|,)=HYPERLINK/m.test(r.text));
  assert.ok(r.text.includes('"Oddiy, ""Ism"""'));
  assert.ok(!/password/i.test(r.text));
  assert.equal(repos.auditRepository.list({ action: 'users.export' }).total, 1);
});

// ---------- tariflar ----------
test('tariflar: seed shared/plans.js dan, narxlar toʻqib chiqarilmaydi (0)', () => {
  const list = repos.tariffsRepository.list();
  assert.deepEqual(list.map((t) => t.id), ['free', 'premium', 'mega']);
  assert.ok(list.every((t) => t.priceMinor === 0));
  assert.equal(list[0].limits.budgets, 3);
  repos.tariffsRepository.ensureSeeded();
  assert.equal(repos.tariffsRepository.list().length, 3);
});

test('tarif narxi: sabab shart, tarix yoziladi, MAVJUD obunachilar tarifi oʻzgarmaydi', async () => {
  const { admin } = await adminCtx();
  const sub = addUser('Obunachi', 'sub@test.uz', { plan: 'premium' });
  let r = await call(handlers.updateTariff, { admin, params: { id: 'premium' }, body: { priceMinor: 4_900_000 } });
  assert.equal(r.body.error.code, 'REASON_REQUIRED');
  r = await call(handlers.updateTariff, { admin, params: { id: 'premium' }, body: { priceMinor: 4_900_000, reason: 'Birinchi narx belgilandi' } });
  assert.equal(r.body.data.tariff.priceMinor, 4_900_000);
  assert.equal(r.body.data.tariff.subscribers, 1);
  assert.equal(usersRepo.getSettings(sub.id).plan, 'premium');
  const history = (await call(handlers.tariffHistory, { admin, params: { id: 'premium' } })).body.data.history;
  assert.equal(history.length, 1);
  assert.equal(history[0].oldPriceMinor, 0);
  assert.equal(history[0].adminUsername, 'uchqun');
  assert.equal(repos.auditRepository.list({ action: 'tariff.price_change' }).total, 1);
  // narx oʻzgarmagan nom tahriri tarixga yozilmaydi
  await call(handlers.updateTariff, { admin, params: { id: 'premium' }, body: { name: 'Premium+' } });
  assert.equal((await call(handlers.tariffHistory, { admin, params: { id: 'premium' } })).body.data.history.length, 1);
});

test('tarif yaratish/oʻchirish: validatsiya, dublikat, tizim tarifi va obunachili tarifni oʻchirib boʻlmaydi', async () => {
  const { admin } = await adminCtx();
  assert.equal((await call(handlers.createTariff, { admin, body: { id: 'Bad Id', name: 'X1' } })).status, 422);
  assert.equal((await call(handlers.createTariff, { admin, body: { id: 'free', name: 'Dup' } })).status, 409);
  assert.equal((await call(handlers.createTariff, { admin, body: { id: 'team', name: 'Jamoa', priceMinor: -5 } })).status, 422);
  const created = await call(handlers.createTariff, { admin, body: { id: 'team', name: 'Jamoa', priceMinor: 9_900_000, billingPeriod: 'yearly', limits: { budgets: 50, goals: null } } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.tariff.limits.goals, null);

  assert.equal((await call(handlers.deleteTariff, { admin, params: { id: 'free' }, body: { reason: 'sinov sinov' } })).body.error.code, 'BUILTIN');
  addUser('Jamoa a', 'team@test.uz', { plan: 'team' });
  assert.equal((await call(handlers.deleteTariff, { admin, params: { id: 'team' }, body: { reason: 'sinov sinov' } })).body.error.code, 'HAS_SUBSCRIBERS');
});

test('tarifni nofaol qilish: standart tarif himoyalangan, obunachi bor boʻlsa tasdiq shart', async () => {
  const { admin } = await adminCtx();
  assert.equal((await call(handlers.updateTariff, { admin, params: { id: 'free' }, body: { isActive: false, reason: 'sabab bor' } })).body.error.code, 'IS_DEFAULT');
  addUser('P', 'p@test.uz', { plan: 'mega' });
  let r = await call(handlers.updateTariff, { admin, params: { id: 'mega' }, body: { isActive: false, reason: 'Vaqtincha yopish' } });
  assert.equal(r.body.error.code, 'CONFIRM_REQUIRED');
  r = await call(handlers.updateTariff, { admin, params: { id: 'mega' }, body: { isActive: false, reason: 'Vaqtincha yopish', confirm: true } });
  assert.equal(r.body.data.tariff.isActive, false);
  const user = addUser('Q', 'q@test.uz');
  assert.equal((await call(handlers.setUserPlan, { admin, params: { id: user.id }, body: { plan: 'mega', reason: 'sabab bor' } })).body.error.code, 'TARIFF_INACTIVE');
});

// ---------- sozlamalar ----------
test('sozlamalar: faqat ruxsat etilgan kalitlar, turi tekshiriladi, ommaviy qism sirsiz', async () => {
  const { admin } = await adminCtx();
  assert.equal((await call(handlers.updateSettings, { admin, body: { evil: 'x' } })).status, 422);
  assert.equal((await call(handlers.updateSettings, { admin, body: { maintenanceMode: 'yes' } })).status, 422);
  assert.equal((await call(handlers.updateSettings, { admin, body: { siteName: 'A' } })).status, 422);
  assert.equal((await call(handlers.updateSettings, { admin, body: { defaultTariff: 'ghost' } })).status, 422);
  const r = await call(handlers.updateSettings, { admin, body: { siteName: 'Finora Pro', registrationEnabled: false, announcementEnabled: true, announcementText: '<b>Yangilik</b>' } });
  assert.equal(r.body.data.settings.siteName, 'Finora Pro');
  assert.equal(r.body.data.settings.announcementText, '<b>Yangilik</b>', 'matn saqlanadi; chiqarishda matn tuguni sifatida koʻrsatiladi');
  const pub = (await call(handlers.publicSettings, {})).body.data.settings;
  assert.equal(pub.registrationEnabled, false);
  assert.ok(!('defaultTariff' in pub));
  assert.equal(repos.auditRepository.list({ action: 'settings.update' }).total, 1);
});

// ---------- dashboard / tahlil / bildirishnomalar ----------
test('dashboard: haqiqiy sonlar, boʻsh bazada nol (toʻqib chiqarilmaydi), noto‘g‘ri sana rad', async () => {
  const { admin } = await adminCtx();
  let r = await call(handlers.dashboard, { admin, query: {} });
  assert.equal(r.body.data.users.total, 0);
  assert.equal(r.body.data.transactions.total, 0);
  assert.equal(r.body.data.series.length, 30);
  addUser('Yangi', 'new@test.uz');
  r = await call(handlers.dashboard, { admin, query: {} });
  assert.equal(r.body.data.users.total, 1);
  assert.equal(r.body.data.users.newToday, 1);
  assert.equal(r.body.data.series.at(-1).totalUsers, 1);
  assert.equal(r.body.data.recentUsers.length, 1);
  assert.equal((await call(handlers.dashboard, { admin, query: { from: '2026-10-10', to: '2026-01-01' } })).status, 422);
  assert.equal((await call(handlers.dashboard, { admin, query: { from: '2020-01-01', to: '2026-01-01' } })).status, 422);
});

test('tahlil va bildirishnomalar ishlaydi (bo‘sh va to‘la bazada)', async () => {
  const { admin } = await adminCtx();
  addUser('Bir', 'one@test.uz');
  await auth.login({ username: 'uchqun', password: 'bad', ip: '9.9.9.9' });
  const a = await call(handlers.analytics, { admin, query: { days: '7' } });
  assert.equal(a.body.data.series.length, 7);
  assert.equal(a.body.data.limitUsage[0].feature, 'budgets');
  const n = await call(handlers.notifications, { admin, query: {} });
  assert.ok(n.body.data.items.some((i) => i.type === 'registration'));
  assert.equal(n.body.data.failedLogins24h, 1);
  const sys = await call(handlers.system, { admin, query: {} });
  assert.equal(sys.body.data.dbOk, true);
  assert.ok(sys.body.data.migrations >= 3);
});

test('migratsiya 0003 mavjud maʼlumotni buzmaydi: yangi ustunlarning standart qiymatlari', () => {
  const u = addUser('Eski', 'old@test.uz');
  const row = db.prepare('SELECT status, last_active_at, plan FROM users WHERE id = ?').get(u.id);
  assert.equal(row.status, 'active');
  assert.equal(row.last_active_at, null);
  assert.equal(row.plan, 'free');
});
