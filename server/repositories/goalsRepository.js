/**
 * repositories/goalsRepository.js
 */

import { randomUUID } from 'node:crypto';

function toApi(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, targetAmount: row.target_amount, currentAmount: row.current_amount, deadline: row.deadline, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function createGoalsRepository(db) {
  return {
    list(userId) {
      return db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId).map(toApi);
    },

    get(userId, id) {
      return toApi(db.prepare('SELECT * FROM goals WHERE user_id = ? AND id = ?').get(userId, id));
    },

    create(userId, record) {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, userId, record.name, record.targetAmount, record.currentAmount ?? 0, record.deadline ?? null, now, now);
      return this.get(userId, id);
    },

    update(userId, id, patch) {
      const current = this.get(userId, id);
      if (!current) return null;
      const merged = { ...current, ...patch };
      db.prepare('UPDATE goals SET name=?, target_amount=?, current_amount=?, deadline=?, updated_at=? WHERE user_id=? AND id=?').run(merged.name, merged.targetAmount, merged.currentAmount, merged.deadline ?? null, new Date().toISOString(), userId, id);
      return this.get(userId, id);
    },

    remove(userId, id) {
      db.prepare('DELETE FROM goals WHERE user_id = ? AND id = ?').run(userId, id);
    },

    bulkInsert(userId, records) {
      const now = new Date().toISOString();
      const insert = db.prepare('INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const record of records) insert.run(randomUUID(), userId, record.name, record.targetAmount, record.currentAmount ?? 0, record.deadline ?? null, now, now);
      return records.length;
    },
  };
}
