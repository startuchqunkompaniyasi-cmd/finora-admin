/**
 * repositories/transactionsRepository.js
 * `transactions` jadvaliga foydalanuvchiga xos (user_id bilan chegaralangan) sinxron soʻrovlar.
 * Qator <-> JS obyekt formatlari orasida oʻtkazish shu yerda (snake_case <-> camelCase, 0/1 <-> bool).
 */

import { randomUUID } from 'node:crypto';

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    fxRateToBase: row.fx_rate_to_base,
    fxRateSource: row.fx_rate_source,
    categoryId: row.category_id,
    description: row.description,
    note: row.note,
    paymentMethod: row.payment_method,
    occurredAt: row.occurred_at,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTransactionsRepository(db) {
  return {
    /**
     * `pagination` ixtiyoriy: `{ limit, offset }` berilsa, natija sahifalanadi (`ORDER BY
     * occurred_at DESC, id DESC` — barqaror tartib uchun ikkinchi kalit). Berilmasa, eski
     * xatti-harakat saqlanadi: BARCHA yozuvlar, tartibsiz (klient hozircha shunday kutadi —
     * PHASE 10 da qoʻshildi, lekin hali standart oqimga ULANMAGAN, faqat API darajasida mavjud).
     */
    list(userId, pagination) {
      if (!pagination) {
        return db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId).map(toApi);
      }
      const { limit, offset = 0 } = pagination;
      return db
        .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?')
        .all(userId, limit, offset)
        .map(toApi);
    },

    count(userId) {
      return db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ?').get(userId).n;
    },

    get(userId, id) {
      return toApi(db.prepare('SELECT * FROM transactions WHERE user_id = ? AND id = ?').get(userId, id));
    },

    create(userId, record) {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO transactions (id, user_id, type, amount, currency, fx_rate_to_base, fx_rate_source, category_id, description, note, payment_method, occurred_at, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, userId, record.type, record.amount, record.currency, record.fxRateToBase ?? null, record.fxRateSource ?? null, record.categoryId, record.description ?? '', record.note ?? '', record.paymentMethod, record.occurredAt, record.isDemo ? 1 : 0, now, now);
      return this.get(userId, id);
    },

    update(userId, id, patch) {
      const existing = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND id = ?').get(userId, id);
      if (!existing) return null;

      const merged = { ...toApi(db.prepare('SELECT * FROM transactions WHERE user_id = ? AND id = ?').get(userId, id)), ...patch };
      db.prepare(
        `UPDATE transactions SET type=?, amount=?, currency=?, fx_rate_to_base=?, fx_rate_source=?, category_id=?, description=?, note=?, payment_method=?, occurred_at=?, is_demo=?, updated_at=?
         WHERE user_id = ? AND id = ?`
      ).run(merged.type, merged.amount, merged.currency, merged.fxRateToBase ?? null, merged.fxRateSource ?? null, merged.categoryId, merged.description ?? '', merged.note ?? '', merged.paymentMethod, merged.occurredAt, merged.isDemo ? 1 : 0, new Date().toISOString(), userId, id);
      return this.get(userId, id);
    },

    remove(userId, id) {
      db.prepare('DELETE FROM transactions WHERE user_id = ? AND id = ?').run(userId, id);
    },

    /** Bulk import (roʻyxatdan oʻtishda mahalliy maʼlumotni koʻchirish uchun). ID'lar qayta yaratiladi. */
    bulkInsert(userId, records) {
      const now = new Date().toISOString();
      const insert = db.prepare(
        `INSERT INTO transactions (id, user_id, type, amount, currency, fx_rate_to_base, fx_rate_source, category_id, description, note, payment_method, occurred_at, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      );
      for (const record of records) {
        insert.run(randomUUID(), userId, record.type, record.amount, record.currency, record.fxRateToBase ?? null, record.fxRateSource ?? null, record.categoryId, record.description ?? '', record.note ?? '', record.paymentMethod, record.occurredAt, now, now);
      }
      return records.length;
    },
  };
}
