/**
 * repositories/usersRepository.js
 * `users` jadvaliga sinxron soʻrovlar (node:sqlite sinxron API taqdim etadi).
 *
 * `createUsersRepository(db)` — DB nusxasini tashqaridan qabul qiladi (dependency injection).
 * Shu tarzda testlar `createTestDb()` bilan toʻliq izolyatsiyalangan xotiradagi bazada ishlaydi,
 * real serverning `server/data/finora.db` fayliga hech qanday taʼsir qilmaydi. Bu xuddi 4-bosqichda
 * `createExchangeStore`/`createExchangeService` uchun tanlangan yondashuv bilan bir xil.
 */

import { randomUUID as cryptoRandomUUID } from 'node:crypto';

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    baseCurrency: row.base_currency,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

function toSettings(row) {
  if (!row) return null;
  return {
    baseCurrency: row.base_currency,
    timezone: row.timezone,
    openingBalance: row.opening_balance,
    plan: row.plan,
    onboardedAt: row.onboarded_at,
    hasDemoData: Boolean(row.has_demo_data),
    demoSeededAt: row.demo_seeded_at,
  };
}

export function createUsersRepository(db) {
  return {
    /** Ichki foydalanish uchun: password_hash bilan birga (autentifikatsiya tekshiruvi uchun). */
    findByEmailRaw(email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    },

    findById(id) {
      return toPublicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    create({ name, email, passwordHash }) {
      const id = cryptoRandomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, email.toLowerCase(), passwordHash, now, now);
      return toPublicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    /** "Moliyaviy profil" (client'dagi profileRepo hujjatiga mos): valyuta, boshlangʻich balans va h.k. */
    getSettings(id) {
      return toSettings(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    updateSettings(id, patch) {
      const current = toSettings(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
      if (!current) return null;
      const merged = { ...current, ...patch };
      db.prepare('UPDATE users SET base_currency=?, timezone=?, opening_balance=?, plan=?, onboarded_at=?, has_demo_data=?, demo_seeded_at=?, updated_at=? WHERE id=?').run(
        merged.baseCurrency, merged.timezone, merged.openingBalance, merged.plan, merged.onboardedAt, merged.hasDemoData ? 1 : 0, merged.demoSeededAt, new Date().toISOString(), id
      );
      return this.getSettings(id);
    },
  };
}
