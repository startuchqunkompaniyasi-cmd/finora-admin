/**
 * repositories/adminsRepository.js
 * `admins`, `admin_sessions` va `admin_login_events` jadvallari. Boshqa repozitoriylar kabi
 * `createAdminsRepository(db)` — bazani tashqaridan oladi (testlarda xotiradagi baza).
 * Parol xeshi faqat `findByUsernameRaw` / `getPasswordHash` orqali, ichki foydalanish uchun.
 */

import { randomUUID } from 'node:crypto';

const toAdmin = (row) =>
  row && {
    id: row.id,
    username: row.username,
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };

export function createAdminsRepository(db) {
  const now = () => new Date().toISOString();

  return {
    count: () => db.prepare('SELECT count(*) AS n FROM admins').get().n,

    /** password_hash bilan (faqat autentifikatsiya uchun). */
    findByUsernameRaw: (username) => db.prepare('SELECT * FROM admins WHERE username = ? COLLATE NOCASE').get(username),
    findRawById: (id) => db.prepare('SELECT * FROM admins WHERE id = ?').get(id),
    findById: (id) => toAdmin(db.prepare('SELECT * FROM admins WHERE id = ?').get(id)),

    create({ username, passwordHash, role = 'superadmin', mustChangePassword = false }) {
      const id = randomUUID();
      const stamp = now();
      db.prepare('INSERT INTO admins (id, username, password_hash, role, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, username, passwordHash, role, mustChangePassword ? 1 : 0, stamp, stamp);
      return this.findById(id);
    },

    recordFailure(id, { maxFailed, lockMinutes }) {
      const row = db.prepare('SELECT failed_attempts FROM admins WHERE id = ?').get(id);
      const attempts = (row?.failed_attempts ?? 0) + 1;
      const lockedUntil = attempts >= maxFailed ? new Date(Date.now() + lockMinutes * 60_000).toISOString() : null;
      db.prepare('UPDATE admins SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?').run(lockedUntil ? 0 : attempts, lockedUntil, now(), id);
      return { locked: Boolean(lockedUntil), lockedUntil };
    },

    recordSuccess(id) {
      const stamp = now();
      db.prepare('UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?').run(stamp, stamp, id);
    },

    updatePassword(id, passwordHash) {
      db.prepare('UPDATE admins SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(passwordHash, now(), id);
    },

    updateUsername(id, username) {
      db.prepare('UPDATE admins SET username = ?, updated_at = ? WHERE id = ?').run(username, now(), id);
    },

    // ----- sessiyalar -----
    createSession({ adminId, tokenHash, ip, userAgent, expiresAt }) {
      const id = randomUUID();
      const stamp = now();
      db.prepare('INSERT INTO admin_sessions (id, admin_id, token_hash, ip, user_agent, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, adminId, tokenHash, ip ?? null, (userAgent ?? '').slice(0, 300), stamp, stamp, expiresAt);
      return id;
    },

    findSessionByTokenHash: (tokenHash) => db.prepare('SELECT * FROM admin_sessions WHERE token_hash = ?').get(tokenHash),
    touchSession: (id) => db.prepare('UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?').run(now(), id),
    deleteSession: (id) => db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(id),
    deleteSessionsForAdmin: (adminId, exceptId = null) => db.prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND id IS NOT ?').run(adminId, exceptId),
    deleteExpiredSessions: () => db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now()),

    listSessions(adminId) {
      return db.prepare('SELECT id, ip, user_agent, created_at, last_seen_at, expires_at FROM admin_sessions WHERE admin_id = ? AND expires_at > ? ORDER BY last_seen_at DESC').all(adminId, now()).map((row) => ({
        id: row.id,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
      }));
    },

    // ----- kirish urinishlari -----
    logLogin({ adminId = null, username, success, reason = null, ip, userAgent }) {
      db.prepare('INSERT INTO admin_login_events (admin_id, username, success, reason, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(adminId, String(username).slice(0, 64), success ? 1 : 0, reason, ip ?? null, (userAgent ?? '').slice(0, 300), now());
    },

    recentLogins(limit = 20) {
      return db.prepare('SELECT username, success, reason, ip, user_agent, created_at FROM admin_login_events ORDER BY id DESC LIMIT ?').all(limit).map((row) => ({
        username: row.username,
        success: Boolean(row.success),
        reason: row.reason,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }));
    },

    failedLoginsSince(isoDate) {
      return db.prepare('SELECT count(*) AS n FROM admin_login_events WHERE success = 0 AND created_at >= ?').get(isoDate).n;
    },
  };
}
