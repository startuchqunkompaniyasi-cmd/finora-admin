/**
 * controllers/adminHandlers.js
 * Admin API handlerlari. `createAdminHandlers(deps)` fabrikasi barcha bogʻliqliklarni tashqaridan
 * oladi (baza repozitoriylari, parol xeshlash) — shu tufayli testlar soxta req/res bilan,
 * xotiradagi baza ustida toʻliq tekshira oladi (adminController.js haqiqiy ulanishni qiladi).
 *
 * Qoidalar:
 *  - har bir oʻzgartiruvchi amal serverda tekshiriladi va audit jurnaliga yoziladi;
 *  - nozik amallar (hisob toʻxtatish, tarif/narx oʻzgarishi) SABAB (kamida 5 belgi) talab qiladi;
 *  - javoblarda parol xeshi, sessiya tokeni yoki boshqa sir hech qachon qaytmaydi.
 */

import { serializeCookie, expireCookie } from '../utils/cookies.js';
import { ADMIN_COOKIE_NAME } from '../services/adminAuthService.js';
import { SETTING_DEFS, validateSettingValue } from '../repositories/settingsRepository.js';
import { addDaysKey, tashkentDayKey } from '../repositories/adminDataRepository.js';
import { recentServerErrors, serverErrorCount } from '../services/errorLog.js';

const ok = (res, data, status = 200) => res.status(status).json({ data });
const fail = (res, status, code, message, field) => res.status(status).json({ error: { code, message, ...(field ? { field } : {}) } });
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const intParam = (v, fallback, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // jadval formulasi orqali hujumdan himoya
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createAdminHandlers({ adminsRepository, auditRepository, dataRepository, tariffsRepository, settingsRepository, adminAuthService, cookieConfig }) {
  const actor = (req) => ({ id: req.admin.id, username: req.admin.username });
  const audit = (req, entry) => auditRepository.append({ admin: actor(req), ip: req.ip, ...entry });
  const needReason = (req, res) => {
    const reason = str(req.body?.reason);
    if (reason.length < 5) {
      fail(res, 422, 'REASON_REQUIRED', 'Sababni kamida 5 belgi bilan yozing.', 'reason');
      return null;
    }
    return reason.slice(0, 500);
  };
  const setCookie = (res, token) => res.setHeader('Set-Cookie', serializeCookie(ADMIN_COOKIE_NAME, token, { httpOnly: true, sameSite: 'strict', secure: cookieConfig.secure, path: '/api/v1/admin', maxAge: cookieConfig.ttlMs }));
  const clearCookie = (res) => res.setHeader('Set-Cookie', expireCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin', httpOnly: true, sameSite: 'strict', secure: cookieConfig.secure }));
  const wrap = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };

  const adminView = (admin) => ({ id: admin.id, username: admin.username, role: admin.role, mustChangePassword: admin.mustChangePassword, lastLoginAt: admin.lastLoginAt });

  return {
    // ================= Autentifikatsiya =================
    login: wrap(async (req, res) => {
      const { username, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return fail(res, 422, 'VALIDATION', 'Login va parolni kiriting.');
      }
      const result = await adminAuthService.login({ username, password, ip: req.ip, userAgent: req.headers['user-agent'] });
      if (!result.ok) return fail(res, result.code === 'LOCKED' ? 429 : 401, result.code, result.message);
      setCookie(res, result.token);
      auditRepository.append({ admin: { id: result.admin.id, username: result.admin.username }, action: 'admin.login', ip: req.ip });
      ok(res, { admin: adminView(result.admin) });
    }),

    logout(req, res) {
      adminAuthService.logout(req.adminSessionId);
      audit(req, { action: 'admin.logout' });
      clearCookie(res);
      ok(res, { ok: true });
    },

    me: (req, res) => ok(res, { admin: req.admin ? adminView(req.admin) : null }),

    changePassword: wrap(async (req, res) => {
      const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
      if (newPassword !== confirmPassword) return fail(res, 422, 'MISMATCH', 'Yangi parol va tasdiqlash mos kelmadi.', 'confirmPassword');
      const result = await adminAuthService.changePassword({ adminId: req.admin.id, sessionId: req.adminSessionId, currentPassword, newPassword });
      audit(req, { action: 'admin.password_change', entityType: 'admin', entityId: req.admin.id, result: result.ok ? 'success' : 'failure', details: result.ok ? { otherSessionsRevoked: true } : { code: result.code } });
      if (!result.ok) return fail(res, result.code === 'INVALID_CREDENTIALS' ? 403 : 422, result.code, result.message, result.field);
      ok(res, { ok: true });
    }),

    changeUsername: wrap(async (req, res) => {
      const before = req.admin.username;
      const result = await adminAuthService.changeUsername({ adminId: req.admin.id, currentPassword: req.body?.currentPassword, username: req.body?.username });
      audit(req, { action: 'admin.username_change', entityType: 'admin', entityId: req.admin.id, result: result.ok ? 'success' : 'failure', details: { before, after: result.ok ? result.admin.username : undefined } });
      if (!result.ok) return fail(res, result.code === 'INVALID_CREDENTIALS' ? 403 : result.code === 'USERNAME_TAKEN' ? 409 : 422, result.code, result.message, result.field);
      ok(res, { admin: adminView(result.admin) });
    }),

    sessions: (req, res) => ok(res, { sessions: adminsRepository.listSessions(req.admin.id).map((s) => ({ ...s, current: s.id === req.adminSessionId })) }),

    revokeOtherSessions(req, res) {
      adminsRepository.deleteSessionsForAdmin(req.admin.id, req.adminSessionId);
      audit(req, { action: 'admin.sessions_revoked', entityType: 'admin', entityId: req.admin.id });
      ok(res, { ok: true });
    },

    loginActivity: (req, res) => ok(res, { events: adminsRepository.recentLogins(25) }),

    // ================= Dashboard / tahlil / tizim =================
    dashboard(req, res) {
      const today = tashkentDayKey();
      const to = isDay(req.query.to) ? req.query.to : today;
      const from = isDay(req.query.from) ? req.query.from : addDaysKey(to, -29);
      if (from > to) return fail(res, 422, 'VALIDATION', 'Boshlanish sanasi tugash sanasidan keyin boʻlmasligi kerak.');
      if (addDaysKey(from, 366) < to) return fail(res, 422, 'VALIDATION', 'Oraliq 366 kundan oshmasligi kerak.');
      ok(res, { ...dataRepository.dashboard({ from, to }), range: { from, to }, recentAudit: auditRepository.recent(6), system: dataRepository.systemStats() });
    },

    analytics(req, res) {
      const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
      ok(res, dataRepository.analytics({ days }));
    },

    system(req, res) {
      const stats = dataRepository.systemStats();
      ok(res, {
        ...stats,
        server: { nodeVersion: process.version, uptimeSeconds: Math.round(process.uptime()), rssBytes: process.memoryUsage().rss, env: process.env.NODE_ENV ?? 'development' },
        maintenanceMode: settingsRepository.get('maintenanceMode'),
        recentErrors: recentServerErrors(10),
        errorCount: serverErrorCount(),
      });
    },

    // ================= Foydalanuvchilar =================
    listUsers(req, res) {
      const q = str(req.query.q).slice(0, 80);
      const status = ['active', 'suspended'].includes(req.query.status) ? req.query.status : '';
      const sort = ['createdAt', 'name', 'lastActive', 'transactions'].includes(req.query.sort) ? req.query.sort : 'createdAt';
      const page = intParam(req.query.page, 1, 1, 100000);
      const pageSize = intParam(req.query.pageSize, 20, 5, 100);
      const result = dataRepository.listUsers({ q, status, plan: str(req.query.plan).slice(0, 40), sort, dir: req.query.dir === 'asc' ? 'asc' : 'desc', page, pageSize });
      ok(res, { ...result, page, pageSize });
    },

    exportUsers(req, res) {
      const rows = dataRepository.exportUsers({ q: str(req.query.q).slice(0, 80), status: ['active', 'suspended'].includes(req.query.status) ? req.query.status : '', plan: str(req.query.plan).slice(0, 40) });
      audit(req, { action: 'users.export', entityType: 'user', details: { rows: rows.length } });
      const header = ['id', 'ism', 'email', 'tarif', 'holat', 'royxatdan_otgan', 'oxirgi_faollik', 'tranzaksiyalar'];
      const lines = [header, ...rows.map((u) => [u.id, u.name, u.email, u.plan, u.status, u.createdAt, u.lastActiveAt, u.transactionCount])].map((line) => line.map(csvCell).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="finora-users-${tashkentDayKey()}.csv"`);
      res.send(`﻿${lines.join('\r\n')}\r\n`);
    },

    getUser(req, res) {
      const user = dataRepository.getUser(req.params.id);
      if (!user) return fail(res, 404, 'NOT_FOUND', 'Foydalanuvchi topilmadi.');
      ok(res, { user });
    },

    updateUser(req, res) {
      const user = dataRepository.getUser(req.params.id);
      if (!user) return fail(res, 404, 'NOT_FOUND', 'Foydalanuvchi topilmadi.');
      const name = str(req.body?.name ?? user.name);
      const email = str(req.body?.email ?? user.email).toLowerCase();
      if (name.length < 1 || name.length > 80) return fail(res, 422, 'VALIDATION', 'Ism 1–80 belgi boʻlishi kerak.', 'name');
      if (!EMAIL_RE.test(email) || email.length > 254) return fail(res, 422, 'VALIDATION', 'Email notoʻgʻri.', 'email');
      if (email !== user.email && dataRepository.emailTaken(email, user.id)) return fail(res, 409, 'EMAIL_TAKEN', 'Bu email band.', 'email');
      dataRepository.updateUserProfile(user.id, { name, email });
      audit(req, { action: 'user.update', entityType: 'user', entityId: user.id, reason: str(req.body?.reason) || null, details: { before: { name: user.name, email: user.email }, after: { name, email } } });
      ok(res, { user: dataRepository.getUser(user.id) });
    },

    setUserStatus(req, res) {
      const user = dataRepository.getUser(req.params.id);
      if (!user) return fail(res, 404, 'NOT_FOUND', 'Foydalanuvchi topilmadi.');
      const status = req.body?.status;
      if (!['active', 'suspended'].includes(status)) return fail(res, 422, 'VALIDATION', 'Holat notoʻgʻri.', 'status');
      if (status === user.status) return fail(res, 409, 'NO_CHANGE', 'Hisob allaqachon shu holatda.');
      const reason = needReason(req, res);
      if (!reason) return undefined;
      dataRepository.setUserStatus(user.id, status);
      audit(req, { action: status === 'suspended' ? 'user.suspend' : 'user.reactivate', entityType: 'user', entityId: user.id, reason, details: { before: user.status, after: status } });
      return ok(res, { user: dataRepository.getUser(user.id) });
    },

    setUserPlan(req, res) {
      const user = dataRepository.getUser(req.params.id);
      if (!user) return fail(res, 404, 'NOT_FOUND', 'Foydalanuvchi topilmadi.');
      const plan = str(req.body?.plan);
      const tariff = tariffsRepository.get(plan);
      if (!tariff) return fail(res, 422, 'VALIDATION', 'Bunday tarif yoʻq.', 'plan');
      if (!tariff.isActive && plan !== user.plan) return fail(res, 422, 'TARIFF_INACTIVE', 'Bu tarif faol emas.', 'plan');
      if (plan === user.plan) return fail(res, 409, 'NO_CHANGE', 'Foydalanuvchi allaqachon shu tarifda.');
      const reason = needReason(req, res);
      if (!reason) return undefined;
      dataRepository.setUserPlan(user.id, plan);
      audit(req, { action: 'user.plan_change', entityType: 'user', entityId: user.id, reason, details: { before: user.plan, after: plan } });
      return ok(res, { user: dataRepository.getUser(user.id) });
    },

    // ================= Tranzaksiyalar (foydalanuvchilarning shaxsiy yozuvlari, faqat oʻqish) =================
    listTransactions(req, res) {
      const page = intParam(req.query.page, 1, 1, 100000);
      const pageSize = intParam(req.query.pageSize, 25, 5, 100);
      const result = dataRepository.listTransactions({
        q: str(req.query.q).slice(0, 80),
        id: str(req.query.id).slice(0, 60),
        type: ['income', 'expense'].includes(req.query.type) ? req.query.type : '',
        currency: ['UZS', 'USD'].includes(req.query.currency) ? req.query.currency : '',
        from: isDay(req.query.from) ? req.query.from : '',
        to: isDay(req.query.to) ? req.query.to : '',
        page,
        pageSize,
      });
      ok(res, { ...result, page, pageSize });
    },

    // ================= Tariflar =================
    listTariffs: (req, res) => ok(res, { tariffs: tariffsRepository.list(), defaultTariff: settingsRepository.get('defaultTariff') }),

    tariffHistory(req, res) {
      if (!tariffsRepository.get(req.params.id)) return fail(res, 404, 'NOT_FOUND', 'Tarif topilmadi.');
      ok(res, { history: tariffsRepository.history(req.params.id) });
    },

    createTariff(req, res) {
      const parsed = parseTariff(req.body ?? {}, { partial: false });
      if (parsed.error) return fail(res, 422, 'VALIDATION', parsed.error.message, parsed.error.field);
      const id = str(req.body.id).toLowerCase();
      if (!/^[a-z][a-z0-9-]{1,29}$/.test(id)) return fail(res, 422, 'VALIDATION', 'Tarif ID: kichik lotin harflari, raqam va tire (2–30 belgi).', 'id');
      if (tariffsRepository.get(id)) return fail(res, 409, 'ID_TAKEN', 'Bu ID band.', 'id');
      const tariff = tariffsRepository.create({ id, ...parsed.value });
      audit(req, { action: 'tariff.create', entityType: 'tariff', entityId: id, details: { after: tariff } });
      ok(res, { tariff }, 201);
    },

    updateTariff(req, res) {
      const current = tariffsRepository.get(req.params.id);
      if (!current) return fail(res, 404, 'NOT_FOUND', 'Tarif topilmadi.');
      const parsed = parseTariff(req.body ?? {}, { partial: true });
      if (parsed.error) return fail(res, 422, 'VALIDATION', parsed.error.message, parsed.error.field);
      const patch = parsed.value;
      const priceChanged = ('priceMinor' in patch && patch.priceMinor !== current.priceMinor) || ('billingPeriod' in patch && patch.billingPeriod !== current.billingPeriod);
      const deactivating = patch.isActive === false && current.isActive;

      if (deactivating && settingsRepository.get('defaultTariff') === current.id) return fail(res, 409, 'IS_DEFAULT', 'Standart tarifni oʻchirib boʻlmaydi. Avval Sozlamalarda boshqa standart tarif tanlang.');
      let reason = null;
      if (priceChanged || deactivating) {
        reason = needReason(req, res);
        if (!reason) return undefined;
      }
      if (deactivating && current.subscribers > 0 && req.body?.confirm !== true) {
        return fail(res, 409, 'CONFIRM_REQUIRED', `Bu tarifda ${current.subscribers} ta foydalanuvchi bor. Ular tarifini saqlab qoladi, lekin yangi foydalanuvchilarga taklif qilinmaydi. Tasdiqlang.`);
      }
      const tariff = tariffsRepository.update(current.id, patch, { adminUsername: req.admin.username, reason });
      audit(req, { action: priceChanged ? 'tariff.price_change' : 'tariff.update', entityType: 'tariff', entityId: current.id, reason, details: { before: pick(current, Object.keys(patch)), after: pick(tariff, Object.keys(patch)), existingSubscribersAffected: 0 } });
      return ok(res, { tariff });
    },

    deleteTariff(req, res) {
      const current = tariffsRepository.get(req.params.id);
      if (!current) return fail(res, 404, 'NOT_FOUND', 'Tarif topilmadi.');
      if (current.isBuiltin) return fail(res, 409, 'BUILTIN', 'Tizim tarifini oʻchirib boʻlmaydi, faqat nofaol qilish mumkin.');
      if (current.subscribers > 0) return fail(res, 409, 'HAS_SUBSCRIBERS', 'Bu tarifda foydalanuvchilar bor.');
      if (settingsRepository.get('defaultTariff') === current.id) return fail(res, 409, 'IS_DEFAULT', 'Standart tarifni oʻchirib boʻlmaydi.');
      const reason = needReason(req, res);
      if (!reason) return undefined;
      tariffsRepository.remove(current.id);
      audit(req, { action: 'tariff.delete', entityType: 'tariff', entityId: current.id, reason, details: { before: current } });
      return ok(res, { ok: true });
    },

    // ================= Sozlamalar =================
    getSettings: (req, res) => ok(res, { settings: settingsRepository.getAll(), tariffs: tariffsRepository.list().map((t) => ({ id: t.id, name: t.name, isActive: t.isActive })) }),

    updateSettings(req, res) {
      const body = req.body ?? {};
      const keys = Object.keys(body).filter((key) => key !== 'reason');
      if (keys.length === 0) return fail(res, 422, 'VALIDATION', 'Oʻzgartirish yoʻq.');
      const patch = {};
      for (const key of keys) {
        const checked = validateSettingValue(key, body[key]);
        if (!checked.ok) return fail(res, 422, 'VALIDATION', checked.message, key);
        patch[key] = checked.value;
      }
      if ('defaultTariff' in patch) {
        const tariff = tariffsRepository.get(patch.defaultTariff);
        if (!tariff || !tariff.isActive) return fail(res, 422, 'VALIDATION', 'Standart tarif faol boʻlishi kerak.', 'defaultTariff');
      }
      const before = settingsRepository.getAll();
      settingsRepository.set(patch, req.admin.username);
      const longText = (key) => SETTING_DEFS[key].type === 'text';
      audit(req, {
        action: 'settings.update',
        entityType: 'settings',
        reason: str(body.reason) || null,
        details: { changed: Object.fromEntries(keys.map((key) => [key, longText(key) ? { changed: true, length: patch[key].length } : { before: before[key], after: patch[key] }])) },
      });
      ok(res, { settings: settingsRepository.getAll() });
    },

    // ================= Bildirishnomalar va audit =================
    notifications(req, res) {
      const day = new Date(Date.now() - 86_400_000).toISOString();
      const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const items = [];
      for (const u of dataRepository.registrationsSince(week, 8)) items.push({ type: 'registration', severity: 'info', at: u.createdAt, text: u.name, entityId: u.id });
      for (const e of recentServerErrors(8)) items.push({ type: 'error', severity: 'error', at: e.at, text: e.message });
      const failed = adminsRepository.failedLoginsSince(day);
      if (failed > 0) items.push({ type: 'security', severity: 'warning', at: new Date().toISOString(), text: String(failed), count: failed });
      for (const e of auditRepository.list({ pageSize: 40 }).items.filter((a) => /^(tariff\.|user\.(suspend|reactivate|plan_change)|settings\.|admin\.(password|username|sessions))/.test(a.action)).slice(0, 12)) {
        items.push({ type: e.action.startsWith('tariff.') ? 'tariff' : e.action.startsWith('admin.') ? 'security' : 'action', severity: 'info', at: e.createdAt, action: e.action, text: e.entityId ?? '', actor: e.adminUsername });
      }
      items.sort((a, b) => (a.at < b.at ? 1 : -1));
      ok(res, { items: items.slice(0, 40), failedLogins24h: failed });
    },

    auditList(req, res) {
      const page = intParam(req.query.page, 1, 1, 100000);
      const pageSize = intParam(req.query.pageSize, 25, 5, 100);
      ok(res, { ...auditRepository.list({ action: str(req.query.action).slice(0, 60) || undefined, page, pageSize }), page, pageSize });
    },

    publicSettings: (req, res) => ok(res, { settings: settingsRepository.getPublic() }),

    /**
     * Foydalanuvchilarga koʻrinadigan tariflar (narx, davr, cheklov) — DOIM bazadan, shuning uchun admin
     * narxni oʻzgartirishi bilan hamma foydalanuvchi yangi narxni koʻradi. Faqat faol tariflar; hisobga
     * kirgan foydalanuvchining joriy tarifi nofaol boʻlsa ham ular qatoriga qoʻshiladi. Ichki maydonlar
     * (obunachilar soni, tarix) chiqmaydi.
     */
    publicTariffs(req, res) {
      const currentPlan = req.userId ? dataRepository.getUser(req.userId)?.plan ?? null : null;
      const tariffs = tariffsRepository
        .list()
        .filter((t) => t.isActive || t.id === currentPlan)
        .map(({ id, name, description, priceMinor, billingPeriod, trialDays, limits, isActive }) => ({ id, name, description, priceMinor, billingPeriod, trialDays, limits, isActive }));
      res.setHeader('Cache-Control', 'no-store');
      ok(res, { tariffs, currentPlan });
    },
  };
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

/** Tarif maydonlarini tekshiradi. partial=true: faqat berilganlari. */
function parseTariff(body, { partial }) {
  const value = {};
  const bad = (message, field) => ({ error: { message, field } });
  const has = (key) => key in body;

  if (!partial || has('name')) {
    const name = str(body.name);
    if (name.length < 2 || name.length > 40) return bad('Tarif nomi 2–40 belgi boʻlishi kerak.', 'name');
    value.name = name;
  }
  if (!partial || has('description')) {
    const description = str(body.description ?? '');
    if (description.length > 200) return bad('Tavsif 200 belgidan oshmasligi kerak.', 'description');
    value.description = description;
  }
  if (!partial || has('priceMinor')) {
    const price = body.priceMinor ?? 0;
    if (!Number.isInteger(price) || price < 0 || price > 1e12) return bad('Narx notoʻgʻri.', 'priceMinor');
    value.priceMinor = price;
  }
  if (!partial || has('billingPeriod')) {
    const period = body.billingPeriod ?? 'monthly';
    if (!['daily', 'monthly', 'yearly'].includes(period)) return bad('Hisob davri notoʻgʻri.', 'billingPeriod');
    value.billingPeriod = period;
  }
  if (!partial || has('trialDays')) {
    const trial = body.trialDays ?? 0;
    if (!Number.isInteger(trial) || trial < 0 || trial > 365) return bad('Sinov muddati 0–365 kun.', 'trialDays');
    value.trialDays = trial;
  }
  if (!partial || has('limits')) {
    const limits = body.limits ?? {};
    if (typeof limits !== 'object' || Array.isArray(limits) || limits === null) return bad('Cheklovlar notoʻgʻri.', 'limits');
    const clean = {};
    for (const key of ['budgets', 'goals']) {
      if (!(key in limits) || limits[key] === null || limits[key] === '') { clean[key] = null; continue; }
      if (!Number.isInteger(limits[key]) || limits[key] < 0 || limits[key] > 100000) return bad('Cheklov butun son (yoki boʻsh = cheksiz) boʻlishi kerak.', 'limits');
      clean[key] = limits[key];
    }
    value.limits = clean;
  }
  if (!partial || has('isActive')) {
    if (typeof (body.isActive ?? true) !== 'boolean') return bad('Holat notoʻgʻri.', 'isActive');
    value.isActive = body.isActive ?? true;
  }
  return { value };
}
