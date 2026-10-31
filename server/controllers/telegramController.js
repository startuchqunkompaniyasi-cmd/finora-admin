/**
 * controllers/telegramController.js
 * Sayt tomoni: ulash kodi olish, holatni koʻrish, uzish. Hammasi `requireAuth` ortida.
 */

import { getDb } from '../database/db.js';
import { createTelegramRepository } from '../repositories/telegramRepository.js';
import { telegramRuntime } from '../services/telegramRuntime.js';

const telegramRepository = createTelegramRepository(getDb());

export const telegramHandlers = {
  status(req, res) {
    const link = telegramRepository.getByUser(req.userId);
    res.json({ data: { enabled: telegramRuntime.enabled, botUsername: telegramRuntime.username, linked: Boolean(link), telegramUsername: link?.username ?? null, linkedAt: link?.linkedAt ?? null } });
  },

  createLink(req, res) {
    if (!telegramRuntime.enabled || !telegramRuntime.username) {
      return res.status(503).json({ error: { code: 'BOT_DISABLED', message: 'Telegram bot hozircha sozlanmagan.' } });
    }
    const { code, expiresAt } = telegramRepository.createLinkCode(req.userId);
    res.status(201).json({ data: { url: `https://t.me/${telegramRuntime.username}?start=${code}`, expiresAt } });
  },

  unlink(req, res) {
    telegramRepository.unlinkByUser(req.userId);
    res.status(204).end();
  },
};
