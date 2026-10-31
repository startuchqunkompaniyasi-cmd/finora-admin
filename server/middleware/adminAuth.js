/**
 * middleware/adminAuth.js
 * Admin sessiyasini cookie'dan aniqlaydi va admin API'ni himoyalaydi. Admin cookie'si
 * (`finora_admin`) foydalanuvchi cookie'sidan alohida: oddiy foydalanuvchi sessiyasi hech qachon
 * admin huquqini bermaydi. Har bir himoyalangan marshrut SERVERDA tekshiriladi — yashirin
 * login oynasi xavfsizlik chegarasi emas.
 */

import { parseCookies } from '../utils/cookies.js';
import { ADMIN_COOKIE_NAME } from '../services/adminAuthService.js';

/** Parolni majburiy almashtirish holatida ruxsat etilgan yoʻllar (`/api/v1/admin` dan keyingi qism). */
const ALLOWED_WHILE_PASSWORD_PENDING = new Set([
  '/auth/me',
  '/auth/logout',
  '/auth/change-password',
  // Profil sahifasi ushbu maʼlumotlarni ham yuklaydi; parolni almashtirishga toʻsqinlik qilmasin.
  '/auth/sessions',
  '/auth/login-activity',
]);

export function createAdminMiddleware({ adminAuthService, enforcePasswordChange }) {
  return {
    /** `req.admin` / `req.adminSessionId` ni qoʻyadi (kirmagan boʻlsa null). Hech qachon rad etmaydi. */
    attachAdmin(req, res, next) {
      res.setHeader('Cache-Control', 'no-store');
      const token = parseCookies(req.headers.cookie)[ADMIN_COOKIE_NAME];
      const resolved = adminAuthService.resolveSession(token);
      req.admin = resolved?.admin ?? null;
      req.adminSessionId = resolved?.sessionId ?? null;
      next();
    },

    requireAdmin(req, res, next) {
      if (!req.admin) return res.status(401).json({ error: { code: 'ADMIN_UNAUTHENTICATED', message: 'Admin sifatida kiring.' } });
      if (enforcePasswordChange && req.admin.mustChangePassword && !ALLOWED_WHILE_PASSWORD_PENDING.has(req.path)) {
        return res.status(403).json({ error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Davom etishdan oldin parolni almashtiring.' } });
      }
      next();
    },

    /** Maʼlumotni oʻzgartiradigan amallar faqat `superadmin` uchun. */
    requireWrite(req, res, next) {
      if (req.admin?.role !== 'superadmin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bu amal uchun ruxsat yoʻq.' } });
      next();
    },
  };
}
