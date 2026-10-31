/**
 * routes/telegram.js
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { telegramHandlers as h } from '../controllers/telegramController.js';

export const telegramRouter = Router();
telegramRouter.use(requireAuth);

const linkLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 10, keyFn: (req) => `tg-link:${req.userId}`, message: 'Juda koʻp urinish boʻldi. Birozdan soʻng qayta urinib koʻring.' });

telegramRouter.get('/status', h.status);
telegramRouter.post('/link', linkLimiter, h.createLink);
telegramRouter.delete('/link', h.unlink);
