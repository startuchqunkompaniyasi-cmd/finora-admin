/**
 * services/telegramService.js
 * Telegram bot ulanishi: holat, ulash havolasi, uzish (`/api/v1/telegram/*`).
 */

import { config } from '../core/config.js';
import { withCsrfHeader } from '../utils/csrf.js';

async function api(path, options = {}) {
  const method = options.method ?? 'GET';
  const response = await fetch(`${config.apiBase}/telegram${path}`, { credentials: 'include', cache: 'no-store', ...options, headers: withCsrfHeader({ 'Content-Type': 'application/json' }, method) });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message ?? `HTTP ${response.status}`);
    error.code = body?.error?.code;
    throw error;
  }
  return body.data;
}

export const getTelegramStatus = () => api('/status');
export const createTelegramLink = () => api('/link', { method: 'POST' });
export const unlinkTelegram = () => api('/link', { method: 'DELETE' });
