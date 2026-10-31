/**
 * services/adminAuthService.js
 * Admin autentifikatsiyasi: login (bloklash bilan), sessiyalar, parol/login almashtirish.
 *
 *  - Xom sessiya tokeni faqat cookie'da; bazada SHA-256 xeshi (foydalanuvchi sessiyalari bilan bir xil naqsh).
 *  - Notoʻgʻri urinishlar hisobda sanaladi: maxFailedAttempts dan keyin lockMinutes daqiqaga bloklanadi.
 *  - Login mavjud emas boʻlsa ham parol xeshlash vaqti sarflanadi (login mavjudligini vaqt orqali bildirmaslik uchun).
 *  - Mutlaq muddat (sessionTtlHours) VA harakatsizlik muddati (idleTimeoutMinutes).
 */

import { randomBytes, createHash } from 'node:crypto';
import { checkAdminPassword, checkAdminUsername } from './adminPasswordPolicy.js';

export const ADMIN_COOKIE_NAME = 'finora_admin';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createAdminAuthService({ adminsRepository, hashPassword, verifyPassword, config }) {
  let dummyHashPromise;
  const dummyHash = () => (dummyHashPromise ??= hashPassword(randomBytes(12).toString('hex')));

  const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

  return {
    async login({ username, password, ip, userAgent }) {
      const name = typeof username === 'string' ? username.trim() : '';
      const row = name && typeof password === 'string' ? adminsRepository.findByUsernameRaw(name) : null;
      const log = (success, reason) => adminsRepository.logLogin({ adminId: row?.id ?? null, username: name || '(boʻsh)', success, reason, ip, userAgent });

      if (row?.locked_until && row.locked_until > new Date().toISOString()) {
        log(false, 'locked');
        return fail('LOCKED', 'Kirish vaqtincha cheklangan. Birozdan soʻng qayta urinib koʻring.');
      }

      const valid = row ? await verifyPassword(password, row.password_hash) : (await verifyPassword(typeof password === 'string' ? password : '', await dummyHash()), false);
      if (!valid) {
        if (row) {
          const { locked } = adminsRepository.recordFailure(row.id, { maxFailed: config.maxFailedAttempts, lockMinutes: config.lockMinutes });
          log(false, locked ? 'locked' : 'bad_credentials');
        } else {
          log(false, 'bad_credentials');
        }
        return fail('INVALID_CREDENTIALS', 'Login yoki parol notoʻgʻri.');
      }

      adminsRepository.recordSuccess(row.id);
      adminsRepository.deleteExpiredSessions();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3_600_000).toISOString();
      adminsRepository.createSession({ adminId: row.id, tokenHash: hashToken(token), ip, userAgent, expiresAt });
      log(true, null);
      return { ok: true, token, admin: adminsRepository.findById(row.id) };
    },

    /** @returns {{admin:object, sessionId:string}|null} */
    resolveSession(token) {
      if (!token || typeof token !== 'string') return null;
      const session = adminsRepository.findSessionByTokenHash(hashToken(token));
      if (!session) return null;
      const nowIso = new Date().toISOString();
      const idleLimit = new Date(Date.now() - config.idleTimeoutMinutes * 60_000).toISOString();
      if (session.expires_at <= nowIso || session.last_seen_at < idleLimit) {
        adminsRepository.deleteSession(session.id);
        return null;
      }
      const admin = adminsRepository.findById(session.admin_id);
      if (!admin) return null;
      adminsRepository.touchSession(session.id);
      return { admin, sessionId: session.id };
    },

    logout(sessionId) {
      if (sessionId) adminsRepository.deleteSession(sessionId);
    },

    async changePassword({ adminId, sessionId, currentPassword, newPassword }) {
      const row = adminsRepository.findRawById(adminId);
      if (!row || typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, row.password_hash))) {
        return fail('INVALID_CREDENTIALS', 'Joriy parol notoʻgʻri.', { field: 'currentPassword' });
      }
      const problem = checkAdminPassword(newPassword, { username: row.username, current: currentPassword });
      if (problem) return fail('WEAK_PASSWORD', problem, { field: 'newPassword' });

      adminsRepository.updatePassword(adminId, await hashPassword(newPassword));
      adminsRepository.deleteSessionsForAdmin(adminId, sessionId); // boshqa barcha qurilmalar qayta kirishi shart
      return { ok: true };
    },

    async changeUsername({ adminId, currentPassword, username }) {
      const row = adminsRepository.findRawById(adminId);
      if (!row || typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, row.password_hash))) {
        return fail('INVALID_CREDENTIALS', 'Joriy parol notoʻgʻri.', { field: 'currentPassword' });
      }
      const next = typeof username === 'string' ? username.trim() : '';
      const problem = checkAdminUsername(next);
      if (problem) return fail('INVALID_USERNAME', problem, { field: 'username' });
      const existing = adminsRepository.findByUsernameRaw(next);
      if (existing && existing.id !== adminId) return fail('USERNAME_TAKEN', 'Bu login band.', { field: 'username' });
      adminsRepository.updateUsername(adminId, next);
      return { ok: true, admin: adminsRepository.findById(adminId) };
    },
  };
}

/** Birinchi ishga tushirish: adminlar yoʻq boʻlsa, env dagi qiymatlardan BITTA admin yaratadi. */
export async function bootstrapAdmin({ adminsRepository, hashPassword, adminEnv, isProduction, log = console }) {
  if (adminsRepository.count() > 0) return { created: false, reason: 'exists' };
  const { bootstrapUsername: username, bootstrapPassword: password } = adminEnv;
  if (!username || !password) {
    log.warn('[finora] Admin yaratilmadi: ADMIN_BOOTSTRAP_USERNAME va ADMIN_BOOTSTRAP_PASSWORD berilmagan.');
    return { created: false, reason: 'not-configured' };
  }
  if (checkAdminUsername(username)) {
    log.error('[finora] Admin yaratilmadi: ADMIN_BOOTSTRAP_USERNAME yaroqsiz.');
    return { created: false, reason: 'bad-username' };
  }
  if (isProduction && checkAdminPassword(password, { username })) {
    log.error('[finora] Admin yaratilmadi: ishlab chiqarishda ADMIN_BOOTSTRAP_PASSWORD kuchli boʻlishi shart (12+ belgi, aralash).');
    return { created: false, reason: 'weak-password-in-production' };
  }
  adminsRepository.create({ username, passwordHash: await hashPassword(password), mustChangePassword: true });
  log.log(`[finora] Admin yaratildi: "${username}". Birinchi kirishdan keyin parolni almashtiring va .env dan ADMIN_BOOTSTRAP_* ni oʻchiring.`);
  return { created: true };
}
