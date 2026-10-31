/**
 * server/app.js
 * Builds the Express app (no listen() here, so tests can import it).
 *
 * PHASE 1: serves the static client, the shared/ modules and a local copy of Chart.js,
 *          plus GET /api/v1/health.
 * PHASE 4+: REST routes are mounted under /api/v1 (see docs/ARCHITECTURE.md).
 * PHASE 9: Helmet xavfsizlik sarlavhalari, CSRF double-submit himoyasi va login/registratsiya
 *          uchun tezlik cheklovchi (rate limiter) qo'shildi.
 */

import express from 'express';
import compression from 'compression';
import { env } from './config/env.js';
import { exchangeRouter } from './routes/exchange.js';
import { authRouter } from './routes/auth.js';
import { dataRouter } from './routes/data.js';
import { attachUser } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import { ensureCsrfCookie, verifyCsrfToken } from './middleware/csrf.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { adminRouter } from './routes/admin.js';
import { telegramRouter } from './routes/telegram.js';
import { adminHandlers } from './controllers/adminController.js';
import { touchUserActivity, maintenanceGate } from './middleware/siteState.js';
import { recordServerError } from './services/errorLog.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(securityHeaders);
  // PHASE 10: JSON/HTML/JS/CSS javoblarini siqadi (gzip). PDF/rasm kabi allaqachon siqilgan
  // formatlar compression kutubxonasi tomonidan avtomatik oʻtkazib yuboriladi.
  app.use(compression());

  // ----- API -----
  app.use(express.json({ limit: '64kb' })); // hajmi kichik: bu yerda fayl yuklanmaydi, faqat forma maʼlumoti
  app.use(attachUser); // har bir soʻrovga req.userId qoʻyadi (mehmon boʻlsa null)
  app.use('/api', touchUserActivity); // ADMIN: oxirgi faollik (5 daqiqada bir marta yoziladi)

  // CSRF: avval cookie bor-yo'qligini ta'minlaydi, keyin o'zgaruvchi so'rovlarni tekshiradi.
  // Faqat /api ostida kerak — statik fayllar uchun ortiqcha.
  app.use('/api', ensureCsrfCookie);
  app.use('/api', verifyCsrfToken);

  // ADMIN: texnik ishlar rejimi (admin API va ommaviy sozlamalar doim ochiq)
  app.use('/api/v1', maintenanceGate);

  const authRateLimiter = createRateLimiter({
    windowMs: env.rateLimit.authWindowMs,
    max: env.rateLimit.authMax,
    keyFn: (req) => `${req.ip}:${req.body?.email || ''}`,
    message: "Juda koʻp urinish boʻldi. Birozdan soʻng qayta urinib koʻring.",
  });

  app.get('/api/v1/health', (req, res) => {
    res.json({ data: { status: 'ok', env: env.nodeEnv } });
  });
  app.get('/api/v1/public/settings', adminHandlers.publicSettings); // ADMIN: sayt nomi, e'lon, texnik ish holati
  app.get('/api/v1/public/tariffs', adminHandlers.publicTariffs); // tariflar DOIM bazadan (admin narxi hammaga yetadi)
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/auth/login', authRateLimiter);
  app.use('/api/v1/auth/register', authRateLimiter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/telegram', telegramRouter);
  app.use('/api/v1', dataRouter);
  app.use('/api/v1/exchange', exchangeRouter);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bunday API manzili mavjud emas.' } });
  });

  // ----- Static files (dotfiles are never served) -----
  const staticOptions = { dotfiles: 'ignore', index: false, maxAge: env.isProduction ? '1h' : 0 };
  // Only the single Chart.js bundle is exposed, not the whole package.
  app.get('/vendor/chart.js/chart.umd.js', (req, res) => {
    res.sendFile('chart.umd.js', { root: env.paths.chartJs, dotfiles: 'ignore' });
  });
  // PHASE 10: haqiqiy PDF eksport uchun — ikkalasi ham lokal serverdan, hech qanday CDN yoʻq
  // (CSP scriptSrc 'self' bilan mos).
  app.get('/vendor/jspdf/jspdf.umd.min.js', (req, res) => {
    res.sendFile('jspdf.umd.min.js', { root: env.paths.jspdf, dotfiles: 'ignore' });
  });
  app.get('/vendor/jspdf-autotable/jspdf.plugin.autotable.min.js', (req, res) => {
    res.sendFile('jspdf.plugin.autotable.min.js', { root: env.paths.jspdfAutotable, dotfiles: 'ignore' });
  });
  app.use('/shared', express.static(env.paths.shared, staticOptions));
  app.use(express.static(env.paths.client, { ...staticOptions, index: 'index.html' }));

  // The client is a hash-routed SPA, so unknown paths are plain 404s.
  app.use((req, res) => {
    res.status(404).type('text/plain; charset=utf-8').send('Topilmadi');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Soʻrov toʻgʻri JSON formatida emas.' } });
    }
    console.error('[finora] Unhandled server error', error);
    recordServerError(error);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Nimadir xato ketdi. Keyinroq qayta urinib koʻring.' } });
  });

  return app;
}
