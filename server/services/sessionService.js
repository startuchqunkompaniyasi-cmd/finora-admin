/**
 * services/sessionService.js
 * Sessiya yaratish/tekshirish/oʻchirish. Xom token faqat cookie'da (foydalanuvchi brauzerida)
 * turadi; bazada uning SHA-256 xeshi saqlanadi — baza sizib chiqsa ham, tokenlarning oʻzi
 * qoʻlga tushmaydi (parol xeshlash bilan bir xil mantiq, lekin bu yerda tezkor SHA-256 yetarli,
 * chunki token oʻzi 256 bitlik tasodifiy qiymat, lugʻat hujumiga ochiq emas).
 *
 * `createSessionService({ sessionsRepository, ... })` — repositories/*.js dagi izohga qarang:
 * testlar oʻz vaqtinchalik repositoriysi bilan toʻliq izolyatsiyalangan nusxa quradi.
 */

import { randomBytes, createHash } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'finora_session';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createSessionService({ sessionsRepository, sessionTtlDays = 30, cookieSecure = false }) {
  return {
    /** @returns {{token:string, expiresAt:string}} `token` cookie'ga qoʻyiladi, bazaga yozilmaydi. */
    createSession(userId, userAgent) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + sessionTtlDays * 86_400_000).toISOString();
      sessionsRepository.create({ userId, tokenHash: hashToken(token), expiresAt, userAgent });
      return { token, expiresAt };
    },

    /** @returns {string|null} sessiya haqiqiy boʻlsa userId, aks holda null. */
    resolveSession(token) {
      if (!token) return null;
      const session = sessionsRepository.findActiveByTokenHash(hashToken(token));
      return session?.user_id ?? null;
    },

    destroySession(token) {
      if (token) sessionsRepository.deleteByTokenHash(hashToken(token));
    },

    deleteExpiredSessions() {
      sessionsRepository.deleteExpired();
    },

    cookieOptions() {
      return { httpOnly: true, sameSite: 'lax', secure: cookieSecure, path: '/', maxAge: sessionTtlDays * 86_400_000 };
    },
  };
}
