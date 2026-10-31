/**
 * admin/api.js
 * Admin API mijozi. Faqat /api/v1/admin ga murojaat qiladi. Sessiya HttpOnly cookie'da
 * (JS uni koʻra olmaydi); bu yerda hech qanday token yoki parol saqlanmaydi (localStorage ham yoʻq).
 * Oʻzgartiruvchi soʻrovlar CSRF sarlavhasini qoʻshadi (utils/csrf.js, ilovaning qolgan qismi bilan bir xil).
 */

import { withCsrfHeader } from '../utils/csrf.js';
import { emit } from '../core/events.js';

const BASE = '/api/v1/admin';

export class AdminApiError extends Error {
  constructor(status, error) {
    super(error?.message || 'Xatolik');
    this.status = status;
    this.code = error?.code;
    this.field = error?.field;
  }
}

export async function api(method, path, body) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: withCsrfHeader({ 'Content-Type': 'application/json', Accept: 'application/json' }, method),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError(0, { code: 'NETWORK', message: 'Serverga ulanib boʻlmadi. Internetni tekshiring.' });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* JSON boʻlmagan javob */
  }

  if (!response.ok) {
    const error = new AdminApiError(response.status, payload?.error ?? { message: 'Server xatosi.' });
    if (error.code === 'ADMIN_UNAUTHENTICATED') emit('admin:unauthenticated');
    if (error.code === 'PASSWORD_CHANGE_REQUIRED') emit('admin:password-required');
    throw error;
  }
  return payload?.data;
}

export const get = (path, params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== '' && value != null) search.set(key, value);
  const suffix = search.toString();
  return api('GET', suffix ? `${path}?${suffix}` : path);
};
export const post = (path, body = {}) => api('POST', path, body);
export const patch = (path, body = {}) => api('PATCH', path, body);
export const del = (path, body = {}) => api('DELETE', path, body);

/** CSV yuklab olish havolasi (cookie bilan, bir xil sayt ichida). */
export const exportUrl = (path, params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== '' && value != null) search.set(key, value);
  return `${BASE}${path}${search.toString() ? `?${search}` : ''}`;
};
