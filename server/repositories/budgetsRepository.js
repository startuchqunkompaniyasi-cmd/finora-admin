/**
 * repositories/budgetsRepository.js
 */

import { randomUUID } from 'node:crypto';

function toApi(row) {
  if (!row) return null;
  return { id: row.id, categoryId: row.category_id, period: row.period, limitAmount: row.limit_amount, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function createBudgetsRepository(db) {
  return {
    list(userId) {
      return db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(userId).map(toApi);
    },

    get(userId, id) {
      return toApi(db.prepare('SELECT * FROM budgets WHERE user_id = ? AND id = ?').get(userId, id));
    },

    create(userId, record) {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO budgets (id, user_id, category_id, period, limit_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, record.categoryId, record.period, record.limitAmount, now, now);
      return this.get(userId, id);
    },

    update(userId, id, patch) {
      const current = this.get(userId, id);
      if (!current) return null;
      const merged = { ...current, ...patch };
      db.prepare('UPDATE budgets SET category_id=?, period=?, limit_amount=?, updated_at=? WHERE user_id=? AND id=?').run(merged.categoryId, merged.period, merged.limitAmount, new Date().toISOString(), userId, id);
      return this.get(userId, id);
    },

    remove(userId, id) {
      db.prepare('DELETE FROM budgets WHERE user_id = ? AND id = ?').run(userId, id);
    },

    bulkInsert(userId, records) {
      const now = new Date().toISOString();
      const insert = db.prepare('INSERT INTO budgets (id, user_id, category_id, period, limit_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const record of records) insert.run(randomUUID(), userId, record.categoryId, record.period, record.limitAmount, now, now);
      return records.length;
    },
  };
}
