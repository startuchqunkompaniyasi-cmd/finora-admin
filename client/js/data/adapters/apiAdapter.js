/**
 * data/adapters/apiAdapter.js
 * localAdapter bilan BIR XIL interfeys (list/get/create/update/remove/replaceAll/clear/
 * getDocument/setDocument), lekin serverdagi `/api/v1/*` orqali. Repositoriylar qaysi adapter
 * ishlatilayotganini bilmaydi — shuning uchun bu fayl yozilgach, boshqa hech narsa oʻzgarmadi.
 *
 * `collection` nomlari toʻgʻridan-toʻgʻri REST yoʻliga mos: 'transactions' -> /api/v1/transactions,
 * 'profile' esa alohida (document) yoʻlga: /api/v1/profile.
 */

import { config } from '../../core/config.js';
import { withCsrfHeader } from '../../utils/csrf.js';

async function api(path, options = {}) {
  const method = options.method ?? 'GET';
  const headers = withCsrfHeader({ 'Content-Type': 'application/json' }, method);
  const response = await fetch(`${config.apiBase}${path}`, { credentials: 'include', ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message ?? `HTTP ${response.status}`);
    error.code = body?.error?.code;
    throw error;
  }
  return body.data;
}

export function createApiAdapter() {
  return {
    mode: 'api',

    async list(collection) {
      return api(`/${collection}`);
    },

    async get(collection, id) {
      // Alohida GET /:id endpointi yoʻq (hozircha kerak emas) — roʻyxatdan qidiramiz.
      const items = await api(`/${collection}`);
      return items.find((item) => item.id === id) ?? null;
    },

    async create(collection, data) {
      return api(`/${collection}`, { method: 'POST', body: JSON.stringify(data) });
    },

    async update(collection, id, patch) {
      return api(`/${collection}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    },

    async remove(collection, id) {
      await api(`/${collection}/${id}`, { method: 'DELETE' });
    },

    /** Faqat mahalliy rejimda ishlatiladi (namuna maʼlumot generatori); api rejimda kerak emas. */
    async replaceAll(collection, items) {
      throw new Error(`replaceAll() api rejimida qoʻllab-quvvatlanmaydi ("${collection}"). Buning oʻrniga bulkImport() dan foydalaning.`);
    },

    async clear(collection) {
      const items = await api(`/${collection}`);
      await Promise.all(items.map((item) => this.remove(collection, item.id)));
    },

    async getDocument(name) {
      return api(`/${name}`);
    },

    async setDocument(name, value) {
      return api(`/${name}`, { method: 'PATCH', body: JSON.stringify(value) });
    },
  };
}
