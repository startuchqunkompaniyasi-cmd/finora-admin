/**
 * repositories/sessionsRepository.js
 * `sessions` jadvaliga sinxron soʻrovlar. Xom token HECH QACHON saqlanmaydi — faqat uning
 * SHA-256 xeshi (`services/sessionService.js` da hisoblanadi).
 *
 * `createSessionsRepository(db)` haqida: repositories/usersRepository.js dagi izohga qarang.
 */

import { randomUUID } from 'node:crypto';

export function createSessionsRepository(db) {
  return {
    create({ userId, tokenHash, expiresAt, userAgent }) {
      const id = randomUUID();
      db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, tokenHash, expiresAt, userAgent ?? null, new Date().toISOString());
      return { id, userId, tokenHash, expiresAt };
    },

    /** Muddati oʻtmagan sessiya bormi — bor boʻlsa userId bilan qaytaradi. */
    findActiveByTokenHash(tokenHash) {
      return db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash, new Date().toISOString());
    },

    deleteByTokenHash(tokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    },

    /** Muddati oʻtgan sessiyalarni tozalaydi (har kirishda chaqiriladi — alohida cron shart emas). */
    deleteExpired() {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
    },
  };
}
