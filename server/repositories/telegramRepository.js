/**
 * repositories/telegramRepository.js
 * Telegram chat <-> Finora hisobi bogʻlanishi va bir martalik ulash kodlari.
 */

import { createHash, randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I chalkashmasligi uchun olib tashlangan
const CODE_TTL_MS = 10 * 60_000;
const hash = (code) => createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');

export function createTelegramRepository(db) {
  return {
    /** Yangi kod yaratadi (eskilari bekor qilinadi). Xom kod faqat shu yerda qaytadi. */
    createLinkCode(userId, now = Date.now()) {
      const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM telegram_link_codes WHERE user_id = ? OR expires_at < ?').run(userId, new Date(now).toISOString());
        db.prepare('INSERT INTO telegram_link_codes (code_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(hash(code), userId, new Date(now + CODE_TTL_MS).toISOString(), new Date(now).toISOString());
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return { code, expiresAt: new Date(now + CODE_TTL_MS).toISOString() };
    },

    /** Kodni bir martalik ishlatadi. @returns {string|null} userId */
    consumeLinkCode(code, now = Date.now()) {
      const row = db.prepare('SELECT user_id, expires_at FROM telegram_link_codes WHERE code_hash = ?').get(hash(code));
      if (!row) return null;
      db.prepare('DELETE FROM telegram_link_codes WHERE code_hash = ?').run(hash(code));
      return Date.parse(row.expires_at) > now ? row.user_id : null;
    },

    /** Hisobni chatga bogʻlaydi. Chat boshqa hisobda boʻlsa `{ conflict: true }`. */
    link(userId, chatId, username) {
      const existing = db.prepare('SELECT user_id FROM telegram_links WHERE chat_id = ?').get(String(chatId));
      if (existing && existing.user_id !== userId) return { conflict: true };
      db.prepare('DELETE FROM telegram_links WHERE user_id = ?').run(userId);
      db.prepare('INSERT INTO telegram_links (user_id, chat_id, telegram_username, linked_at) VALUES (?, ?, ?, ?)').run(userId, String(chatId), username ?? null, new Date().toISOString());
      return { conflict: false };
    },

    unlinkByUser(userId) {
      db.prepare('DELETE FROM telegram_links WHERE user_id = ?').run(userId);
    },
    unlinkByChat(chatId) {
      db.prepare('DELETE FROM telegram_links WHERE chat_id = ?').run(String(chatId));
    },

    getByUser(userId) {
      const row = db.prepare('SELECT chat_id, telegram_username, linked_at FROM telegram_links WHERE user_id = ?').get(userId);
      return row ? { chatId: row.chat_id, username: row.telegram_username, linkedAt: row.linked_at } : null;
    },

    /** Chatga bogʻlangan faol hisob (ism, holat, valyuta, vaqt zonasi) yoki null. */
    findUserByChat(chatId) {
      const row = db.prepare('SELECT u.id, u.name, u.status, u.base_currency, u.timezone FROM telegram_links l JOIN users u ON u.id = l.user_id WHERE l.chat_id = ?').get(String(chatId));
      return row ? { id: row.id, name: row.name, status: row.status, baseCurrency: row.base_currency, timezone: row.timezone } : null;
    },
  };
}
