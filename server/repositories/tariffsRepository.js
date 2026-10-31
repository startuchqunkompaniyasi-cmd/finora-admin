/**
 * repositories/tariffsRepository.js
 * Tariflar va narx tarixi. Birinchi ishga tushirishda `shared/plans.js` dagi uchta tarif
 * (free / premium / mega) jadvalga NUSXALANADI (`ensureSeeded`). Narxlar toʻqib chiqarilmaydi:
 * mahsulot egasi hali narx belgilamagan, shuning uchun hammasi 0 bilan boshlanadi va admin
 * panelida "narx belgilanmagan" deb koʻrsatiladi.
 */

import { PLANS, PLAN_IDS } from '../../shared/plans.js';

const SEED_LIMITS = { free: { budgets: 3, goals: 2 }, premium: { budgets: null, goals: null }, mega: { budgets: null, goals: null } };

const toTariff = (row, subscribers = 0) =>
  row && {
    id: row.id,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    billingPeriod: row.billing_period,
    trialDays: row.trial_days,
    limits: JSON.parse(row.limits || '{}'),
    isActive: Boolean(row.is_active),
    isBuiltin: Boolean(row.is_builtin),
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    subscribers,
  };

export function createTariffsRepository(db) {
  const now = () => new Date().toISOString();
  const subscriberCount = (id) => db.prepare('SELECT count(*) AS n FROM users WHERE plan = ?').get(id).n;

  const repo = {
    ensureSeeded() {
      if (db.prepare('SELECT count(*) AS n FROM tariffs').get().n > 0) return;
      const stamp = now();
      const insert = db.prepare('INSERT INTO tariffs (id, name, description, price_minor, billing_period, trial_days, limits, is_active, is_builtin, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, \'monthly\', 0, ?, 1, 1, ?, ?, ?)');
      PLAN_IDS.forEach((id, index) => insert.run(id, PLANS[id].name, PLANS[id].tagline, JSON.stringify(SEED_LIMITS[id] ?? {}), (index + 1) * 10, stamp, stamp));
    },

    list() {
      return db.prepare('SELECT * FROM tariffs ORDER BY sort_order, created_at').all().map((row) => toTariff(row, subscriberCount(row.id)));
    },

    get(id) {
      const row = db.prepare('SELECT * FROM tariffs WHERE id = ?').get(id);
      return row ? toTariff(row, subscriberCount(id)) : null;
    },

    create({ id, name, description, priceMinor, billingPeriod, trialDays, limits, isActive }) {
      const stamp = now();
      db.prepare('INSERT INTO tariffs (id, name, description, price_minor, billing_period, trial_days, limits, is_active, is_builtin, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 100, ?, ?)').run(id, name, description, priceMinor, billingPeriod, trialDays, JSON.stringify(limits ?? {}), isActive ? 1 : 0, stamp, stamp);
      return this.get(id);
    },

    /** Narx yoki davr oʻzgarsa, tarix yozuvi avtomatik qoʻshiladi (bitta tranzaksiyada). */
    update(id, patch, { adminUsername, reason }) {
      const current = this.get(id);
      if (!current) return null;
      const next = { ...current, ...patch };
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE tariffs SET name=?, description=?, price_minor=?, billing_period=?, trial_days=?, limits=?, is_active=?, updated_at=? WHERE id=?').run(next.name, next.description, next.priceMinor, next.billingPeriod, next.trialDays, JSON.stringify(next.limits ?? {}), next.isActive ? 1 : 0, now(), id);
        if (next.priceMinor !== current.priceMinor || next.billingPeriod !== current.billingPeriod) {
          db.prepare('INSERT INTO tariff_price_history (tariff_id, old_price_minor, new_price_minor, old_billing_period, new_billing_period, admin_username, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, current.priceMinor, next.priceMinor, current.billingPeriod, next.billingPeriod, adminUsername, reason ?? null, now());
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return this.get(id);
    },

    remove(id) {
      db.prepare('DELETE FROM tariffs WHERE id = ? AND is_builtin = 0').run(id);
    },

    history(id) {
      return db.prepare('SELECT * FROM tariff_price_history WHERE tariff_id = ? ORDER BY id DESC LIMIT 50').all(id).map((row) => ({
        oldPriceMinor: row.old_price_minor,
        newPriceMinor: row.new_price_minor,
        oldBillingPeriod: row.old_billing_period,
        newBillingPeriod: row.new_billing_period,
        adminUsername: row.admin_username,
        reason: row.reason,
        createdAt: row.created_at,
      }));
    },

    distribution() {
      return db.prepare('SELECT plan AS id, count(*) AS users FROM users GROUP BY plan ORDER BY users DESC').all();
    },
  };
  return repo;
}
