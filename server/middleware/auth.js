/**
 * middleware/auth.js
 * `req.userId` ni cookie'dagi sessiya asosida belgilaydi (mehmon boʻlsa `null`).
 * Hech qanday marshrut hozircha MAJBURIY login talab qilmaydi (ilova akkauntsiz ham toʻliq
 * ishlaydi — maʼlumotlar hali localStorage'da, 8-bosqichgacha). `requireAuth` faqat haqiqatan
 * foydalanuvchini talab qiladigan marshrutlar uchun tayyor.
 *
 * `sessionService` authController.js dan olinadi: ikkalasi ham `getDb()` (keshlangan yagona
 * ulanish) asosida qurilgan, shuning uchun bitta haqiqiy sessiya jadvali bilan ishlaydi.
 */

import { parseCookies } from '../utils/cookies.js';
import { SESSION_COOKIE_NAME, sessionService } from '../controllers/authController.js';

export function attachUser(req, res, next) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];
  req.sessionToken = token ?? null;
  req.userId = sessionService.resolveSession(token);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Avval hisobingizga kiring.' } });
  }
  next();
}
