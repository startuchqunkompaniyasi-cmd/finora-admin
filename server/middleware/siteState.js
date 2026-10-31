/**
 * middleware/siteState.js
 *  - touchUserActivity: foydalanuvchining `last_active_at` ini kamida 5 daqiqada bir yangilaydi
 *    (admin tahlili uchun; boshqa hech narsa yozilmaydi).
 *  - maintenanceGate: texnik ishlar rejimi yoqilgan boʻlsa, /api/v1 ning ommaviy qismidan
 *    tashqari hamma narsa 503 qaytaradi. Admin API hech qachon bloklanmaydi.
 */

import { getDb } from '../database/db.js';
import { settingsRepository } from '../controllers/adminController.js';

const TOUCH_INTERVAL_MS = 5 * 60_000;
const lastTouched = new Map(); // userId -> ms

export function touchUserActivity(req, res, next) {
  if (req.userId) {
    const now = Date.now();
    if (now - (lastTouched.get(req.userId) ?? 0) > TOUCH_INTERVAL_MS) {
      lastTouched.set(req.userId, now);
      try {
        getDb().prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(new Date(now).toISOString(), req.userId);
      } catch (error) {
        console.warn('[finora] last_active_at yangilanmadi', error.message);
      }
    }
  }
  next();
}

const ALWAYS_OPEN = [/^\/health$/, /^\/admin(\/|$)/, /^\/public(\/|$)/, /^\/auth\/(me|logout)$/];

export function maintenanceGate(req, res, next) {
  if (ALWAYS_OPEN.some((re) => re.test(req.path))) return next();
  if (!settingsRepository.get('maintenanceMode')) return next();
  res.setHeader('Retry-After', '300');
  res.status(503).json({ error: { code: 'MAINTENANCE', message: settingsRepository.get('maintenanceMessage') } });
}
