/**
 * services/authService.js
 * Serverdagi `/api/v1/auth/*` bilan gaplashadi. Sessiya cookie orqali ishlaydi (`credentials:
 * 'include'` — brauzer cookie'ni avtomatik yuboradi/saqlaydi, kodda tokenni oʻzimiz tashimaymiz).
 *
 * MUHIM: bu servis FOYDALANUVCHI IDENTIFIKATSIYASI (ism, email, akkaunt, sessiya) uchun.
 * Moliyaviy maʼlumotlar (tranzaksiya, byudjet, maqsad) `data/adapters/index.js` orqali —
 * hisobga kirilganda avtomatik `apiAdapter`ga, mehmon holatida `localAdapter`ga oʻtadi.
 * `register()` shu qurilmadagi mahalliy maʼlumotni BIR MARTA yangi hisobga koʻchiradi
 * (`services/importService.js`) — batafsili oʻsha faylda.
 */

import { config } from '../core/config.js';
import { store } from '../core/store.js';
import { importLocalDataToAccount } from './importService.js';
import { withCsrfHeader } from '../utils/csrf.js';

async function api(path, options = {}) {
  const method = options.method ?? 'GET';
  const headers = withCsrfHeader({ 'Content-Type': 'application/json' }, method);
  const response = await fetch(`${config.apiBase}${path}`, { credentials: 'include', ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message ?? `HTTP ${response.status}`);
    error.code = body?.error?.code;
    error.field = body?.error?.field;
    error.errors = body?.error?.errors ?? null;
    throw error;
  }
  return body.data;
}

/** Joriy sessiyani serverdan tekshiradi va `store`'ga yozadi. Ilova ochilganda bir marta chaqiriladi. */
export async function refreshSession() {
  try {
    const { user } = await api('/auth/me');
    store.set('session', user);
    return user;
  } catch (error) {
    console.warn('[finora] Sessiyani tekshirib boʻlmadi (server ishlamayotgan boʻlishi mumkin).', error);
    store.set('session', null);
    return null;
  }
}

export async function register({ name, email, password }) {
  const { user } = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  store.set('session', user);

  // Shu qurilmadagi mahalliy maʼlumotni (agar bor boʻlsa) yangi hisobga koʻchiramiz. Xato boʻlsa
  // ham roʻyxatdan oʻtishning oʻzi muvaffaqiyatli hisoblanadi — foydalanuvchi hisobsiz qolmasin
  // (u holda import.js orqali keyinroq qoʻlda ham urinib koʻrish mumkin boʻladi, kelajakda).
  try {
    const imported = await importLocalDataToAccount();
    if (imported) console.info('[finora] Mahalliy maʼlumot hisobga koʻchirildi:', imported);
  } catch (error) {
    console.error('[finora] Mahalliy maʼlumotni koʻchirib boʻlmadi (hisob baribir yaratildi)', error);
  }

  return user;
}

export async function login({ email, password }) {
  const { user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  store.set('session', user);
  return user;
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' });
  store.set('session', null);
}

export const getSession = () => store.get('session', null);
