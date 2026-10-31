/**
 * routes/admin.js
 * /api/v1/admin/*. Faqat `login` ochiq; qolgan HAMMA marshrut `requireAdmin` dan oʻtadi, va
 * oʻzgartiruvchi (POST/PATCH/DELETE) amallar qoʻshimcha `requireWrite` (superadmin) talab qiladi.
 * CSRF (double-submit) app.js da butun /api uchun allaqachon yoqilgan.
 */

import { Router } from 'express';
import { adminHandlers as h, adminMiddleware as m } from '../controllers/adminController.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

export const adminRouter = Router();

const loginLimiter = createRateLimiter({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  keyFn: (req) => `admin-login:${req.ip}`,
  message: 'Juda koʻp urinish boʻldi. Birozdan soʻng qayta urinib koʻring.',
});

adminRouter.use(m.attachAdmin);

adminRouter.post('/auth/login', loginLimiter, h.login);

// ---- Quyidagilarning hammasi admin sessiyasini talab qiladi ----
adminRouter.use(m.requireAdmin);

adminRouter.get('/auth/me', h.me);
adminRouter.post('/auth/logout', h.logout);
adminRouter.post('/auth/change-password', m.requireWrite, h.changePassword);
adminRouter.post('/auth/change-username', m.requireWrite, h.changeUsername);
adminRouter.get('/auth/sessions', h.sessions);
adminRouter.post('/auth/sessions/revoke-others', h.revokeOtherSessions);
adminRouter.get('/auth/login-activity', h.loginActivity);

adminRouter.get('/dashboard', h.dashboard);
adminRouter.get('/analytics', h.analytics);
adminRouter.get('/system', h.system);
adminRouter.get('/notifications', h.notifications);
adminRouter.get('/audit', h.auditList);

adminRouter.get('/users', h.listUsers);
adminRouter.get('/users/export', h.exportUsers);
adminRouter.get('/users/:id', h.getUser);
adminRouter.patch('/users/:id', m.requireWrite, h.updateUser);
adminRouter.post('/users/:id/status', m.requireWrite, h.setUserStatus);
adminRouter.post('/users/:id/plan', m.requireWrite, h.setUserPlan);

adminRouter.get('/transactions', h.listTransactions);

adminRouter.get('/tariffs', h.listTariffs);
adminRouter.post('/tariffs', m.requireWrite, h.createTariff);
adminRouter.get('/tariffs/:id/history', h.tariffHistory);
adminRouter.patch('/tariffs/:id', m.requireWrite, h.updateTariff);
adminRouter.delete('/tariffs/:id', m.requireWrite, h.deleteTariff);

adminRouter.get('/settings', h.getSettings);
adminRouter.patch('/settings', m.requireWrite, h.updateSettings);

// Noma'lum admin manzillari: 404 (ochiq ma'lumot bermaydi).
adminRouter.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Topilmadi.' } }));
