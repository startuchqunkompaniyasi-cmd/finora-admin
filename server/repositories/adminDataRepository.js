/**
 * repositories/adminDataRepository.js
 * Admin paneli uchun OʻQISH soʻrovlari (foydalanuvchilar, tranzaksiyalar, dashboard, tahlil)
 * va foydalanuvchi holati/tarifini oʻzgartirish. Barcha soʻrovlar parametrlangan (prepared).
 *
 * Maxfiylik: foydalanuvchining tranzaksiya `description`/`note` matnlari bu yerdan CHIQMAYDI
 * (admin faqat tur, summa, valyuta, kategoriya va sanani koʻradi). Parol xeshi va sessiya
 * tokenlari hech qanday soʻrovda tanlanmaydi.
 *
 * Kunlar Asia/Tashkent (UTC+5, yozgi vaqtsiz) boʻyicha hisoblanadi.
 */

const TZ_OFFSET_HOURS = 5;
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' (Toshkent kuni) -> shu kunning boshlanishi UTC ISO formatida. */
export const tashkentDayStartIso = (dayKey) => new Date(`${dayKey}T00:00:00+0${TZ_OFFSET_HOURS}:00`).toISOString();
export const tashkentDayKey = (date = new Date()) => new Date(date.getTime() + TZ_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
export const addDaysKey = (dayKey, days) => new Date(new Date(`${dayKey}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

const escapeLike = (text) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

const SORTS = {
  createdAt: 'u.created_at',
  name: 'u.name COLLATE NOCASE',
  lastActive: 'u.last_active_at',
  transactions: 'tx_count',
};

const toUserRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  plan: row.plan,
  status: row.status,
  baseCurrency: row.base_currency,
  createdAt: row.created_at,
  lastActiveAt: row.last_active_at,
  transactionCount: row.tx_count ?? 0,
});

export function createAdminDataRepository(db) {
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);

  /** WHERE bo'lagi + argumentlar (foydalanuvchilar uchun). */
  function userFilters({ q, status, plan }) {
    const where = [];
    const args = [];
    if (q) {
      const like = `%${escapeLike(q.toLowerCase())}%`;
      where.push("(lower(u.name) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\' OR u.id = ? OR u.id LIKE ? ESCAPE '\\')");
      args.push(like, like, q, `${escapeLike(q)}%`);
    }
    if (status) { where.push('u.status = ?'); args.push(status); }
    if (plan) { where.push('u.plan = ?'); args.push(plan); }
    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  return {
    // ================= Foydalanuvchilar =================
    listUsers({ q, status, plan, sort = 'createdAt', dir = 'desc', page = 1, pageSize = 20 }) {
      const { clause, args } = userFilters({ q, status, plan });
      const orderBy = `${SORTS[sort] ?? SORTS.createdAt} ${dir === 'asc' ? 'ASC' : 'DESC'}, u.id`;
      const total = one(`SELECT count(*) AS n FROM users u ${clause}`, ...args).n;
      const rows = all(`SELECT u.*, (SELECT count(*) FROM transactions t WHERE t.user_id = u.id) AS tx_count FROM users u ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, ...args, pageSize, (page - 1) * pageSize);
      return { total, items: rows.map(toUserRow) };
    },

    /** CSV eksport uchun (eng koʻpi 10 000 qator). */
    exportUsers(filters) {
      const { clause, args } = userFilters(filters);
      return all(`SELECT u.*, (SELECT count(*) FROM transactions t WHERE t.user_id = u.id) AS tx_count FROM users u ${clause} ORDER BY u.created_at DESC LIMIT 10000`, ...args).map(toUserRow);
    },

    getUser(id) {
      const u = one('SELECT * FROM users WHERE id = ?', id);
      if (!u) return null;

      const counts = one('SELECT (SELECT count(*) FROM transactions WHERE user_id = ?1) AS tx, (SELECT count(*) FROM budgets WHERE user_id = ?1) AS budgets, (SELECT count(*) FROM goals WHERE user_id = ?1) AS goals, (SELECT count(*) FROM sessions WHERE user_id = ?1 AND expires_at > ?2) AS sessions', id, new Date().toISOString());

      // Balans foydalanuvchining OʻZ yozuvlaridan hisoblanadi (asosiy valyutada). Kursi yoʻq xorijiy
      // valyutadagi yozuvlar hisobga olinmaydi va alohida sanaladi — taxmin qilinmaydi.
      const bal = one(
        `SELECT
           coalesce(sum(CASE WHEN type='income' THEN conv END), 0) AS income,
           coalesce(sum(CASE WHEN type='expense' THEN conv END), 0) AS expense,
           sum(CASE WHEN conv IS NULL THEN 1 ELSE 0 END) AS unconverted
         FROM (SELECT type, CASE WHEN currency = ?2 THEN amount WHEN fx_rate_to_base IS NOT NULL THEN CAST(round(amount * fx_rate_to_base) AS INTEGER) END AS conv
               FROM transactions WHERE user_id = ?1)`,
        id,
        u.base_currency
      );

      const lastTransactions = all('SELECT id, type, amount, currency, category_id, occurred_at, is_demo FROM transactions WHERE user_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 10', id).map((t) => ({
        id: t.id, type: t.type, amount: t.amount, currency: t.currency, categoryId: t.category_id, occurredAt: t.occurred_at, isDemo: Boolean(t.is_demo),
      }));

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        status: u.status,
        baseCurrency: u.base_currency,
        timezone: u.timezone,
        createdAt: u.created_at,
        lastActiveAt: u.last_active_at,
        onboardedAt: u.onboarded_at,
        hasDemoData: Boolean(u.has_demo_data),
        usage: { transactions: counts.tx, budgets: counts.budgets, goals: counts.goals, activeSessions: counts.sessions },
        balance: {
          currency: u.base_currency,
          openingMinor: u.opening_balance,
          incomeMinor: bal.income,
          expenseMinor: bal.expense,
          currentMinor: u.opening_balance + bal.income - bal.expense,
          unconvertedCount: bal.unconverted ?? 0,
        },
        lastTransactions,
      };
    },

    emailTaken: (email, exceptId) => Boolean(one('SELECT 1 AS x FROM users WHERE email = ? AND id != ?', email.toLowerCase(), exceptId)),

    updateUserProfile(id, { name, email }) {
      db.prepare('UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?').run(name, email.toLowerCase(), new Date().toISOString(), id);
    },

    /** Hisobni to'xtatganda foydalanuvchining barcha sessiyalari ham o'chiriladi. */
    setUserStatus(id, status) {
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id);
        if (status === 'suspended') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    setUserPlan(id, plan) {
      db.prepare('UPDATE users SET plan = ?, updated_at = ? WHERE id = ?').run(plan, new Date().toISOString(), id);
    },

    // ================= Tranzaksiyalar (foydalanuvchilarning shaxsiy yozuvlari, faqat oʻqish) =================
    listTransactions({ q, id, type, currency, from, to, page = 1, pageSize = 25 }) {
      const where = [];
      const args = [];
      if (q) {
        const like = `%${escapeLike(q.toLowerCase())}%`;
        where.push("(lower(u.name) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\' OR u.id = ?)");
        args.push(like, like, q);
      }
      if (id) { where.push('t.id = ?'); args.push(id); }
      if (type) { where.push('t.type = ?'); args.push(type); }
      if (currency) { where.push('t.currency = ?'); args.push(currency); }
      if (from) { where.push('t.occurred_at >= ?'); args.push(tashkentDayStartIso(from)); }
      if (to) { where.push('t.occurred_at < ?'); args.push(tashkentDayStartIso(addDaysKey(to, 1))); }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const total = one(`SELECT count(*) AS n FROM transactions t JOIN users u ON u.id = t.user_id ${clause}`, ...args).n;
      const rows = all(`SELECT t.id, t.type, t.amount, t.currency, t.category_id, t.occurred_at, t.created_at, t.is_demo, u.id AS user_id, u.name AS user_name FROM transactions t JOIN users u ON u.id = t.user_id ${clause} ORDER BY t.occurred_at DESC, t.id DESC LIMIT ? OFFSET ?`, ...args, pageSize, (page - 1) * pageSize);
      const totals = all(`SELECT t.currency, t.type, sum(t.amount) AS sum, count(*) AS n FROM transactions t JOIN users u ON u.id = t.user_id ${clause} GROUP BY t.currency, t.type`, ...args);

      return {
        total,
        totals: totals.map((r) => ({ currency: r.currency, type: r.type, sumMinor: r.sum, count: r.n })),
        items: rows.map((r) => ({ id: r.id, type: r.type, amount: r.amount, currency: r.currency, categoryId: r.category_id, occurredAt: r.occurred_at, createdAt: r.created_at, isDemo: Boolean(r.is_demo), userId: r.user_id, userName: r.user_name })),
      };
    },

    // ================= Dashboard =================
    dashboard({ from, to }) {
      const todayKey = tashkentDayKey();
      const startOfToday = tashkentDayStartIso(todayKey);
      const weekStart = tashkentDayStartIso(addDaysKey(todayKey, -6));
      const monthStart = tashkentDayStartIso(addDaysKey(todayKey, -29));
      const activeSince = new Date(Date.now() - 30 * DAY_MS).toISOString();
      const rangeStart = tashkentDayStartIso(from);
      const rangeEnd = tashkentDayStartIso(addDaysKey(to, 1));

      const users = one(
        `SELECT count(*) AS total,
                sum(CASE WHEN status='suspended' THEN 1 ELSE 0 END) AS suspended,
                sum(CASE WHEN last_active_at >= ?1 THEN 1 ELSE 0 END) AS active,
                sum(CASE WHEN created_at >= ?2 THEN 1 ELSE 0 END) AS today,
                sum(CASE WHEN created_at >= ?3 THEN 1 ELSE 0 END) AS week,
                sum(CASE WHEN created_at >= ?4 THEN 1 ELSE 0 END) AS month
         FROM users`,
        activeSince, startOfToday, weekStart, monthStart
      );

      const tx = one('SELECT count(*) AS total, sum(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS today FROM transactions', startOfToday);
      const inRange = one('SELECT count(*) AS n FROM transactions WHERE occurred_at >= ? AND occurred_at < ?', rangeStart, rangeEnd).n;
      const volume = all('SELECT currency, type, sum(amount) AS sum FROM transactions WHERE occurred_at >= ? AND occurred_at < ? GROUP BY currency, type', rangeStart, rangeEnd).map((r) => ({ currency: r.currency, type: r.type, sumMinor: r.sum }));

      const growthRows = all("SELECT date(created_at, '+5 hours') AS day, count(*) AS n FROM users WHERE created_at >= ? AND created_at < ? GROUP BY day", rangeStart, rangeEnd);
      const txRows = all("SELECT date(created_at, '+5 hours') AS day, count(*) AS n FROM transactions WHERE created_at >= ? AND created_at < ? GROUP BY day", rangeStart, rangeEnd);
      const baseline = one('SELECT count(*) AS n FROM users WHERE created_at < ?', rangeStart).n;

      const days = [];
      for (let key = from; key <= to; key = addDaysKey(key, 1)) days.push(key);
      const growthMap = new Map(growthRows.map((r) => [r.day, r.n]));
      const txMap = new Map(txRows.map((r) => [r.day, r.n]));
      let running = baseline;
      const series = days.map((day) => {
        const newUsers = growthMap.get(day) ?? 0;
        running += newUsers;
        return { day, newUsers, totalUsers: running, transactions: txMap.get(day) ?? 0 };
      });

      return {
        users: { total: users.total, active30d: users.active ?? 0, suspended: users.suspended ?? 0, newToday: users.today ?? 0, newWeek: users.week ?? 0, newMonth: users.month ?? 0 },
        transactions: { total: tx.total, createdToday: tx.today ?? 0, inRange },
        volume,
        tariffDistribution: all('SELECT plan AS id, count(*) AS users FROM users GROUP BY plan ORDER BY users DESC'),
        recentUsers: all('SELECT id, name, email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 6').map((r) => ({ id: r.id, name: r.name, email: r.email, plan: r.plan, createdAt: r.created_at })),
        recentTransactions: all('SELECT t.id, t.type, t.amount, t.currency, t.created_at, u.id AS user_id, u.name AS user_name FROM transactions t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 6').map((r) => ({ id: r.id, type: r.type, amount: r.amount, currency: r.currency, createdAt: r.created_at, userId: r.user_id, userName: r.user_name })),
        series,
      };
    },

    // ================= Tahlil =================
    analytics({ days }) {
      const todayKey = tashkentDayKey();
      const fromKey = addDaysKey(todayKey, -(days - 1));
      const rangeStart = tashkentDayStartIso(fromKey);
      const nowMs = Date.now();
      const since = (d) => new Date(nowMs - d * DAY_MS).toISOString();

      const active = one('SELECT sum(CASE WHEN last_active_at >= ?1 THEN 1 ELSE 0 END) AS dau, sum(CASE WHEN last_active_at >= ?2 THEN 1 ELSE 0 END) AS wau, sum(CASE WHEN last_active_at >= ?3 THEN 1 ELSE 0 END) AS mau, sum(CASE WHEN last_active_at IS NULL THEN 1 ELSE 0 END) AS never FROM users', since(1), since(7), since(30));

      // Faol yaratuvchilar: shu kunda yangi tranzaksiya qoʻshgan noyob foydalanuvchilar (haqiqiy tarix).
      const creators = all("SELECT date(created_at, '+5 hours') AS day, count(DISTINCT user_id) AS n, count(*) AS tx FROM transactions WHERE created_at >= ? GROUP BY day", rangeStart);
      const signups = all("SELECT date(created_at, '+5 hours') AS day, count(*) AS n FROM users WHERE created_at >= ? GROUP BY day", rangeStart);
      const cMap = new Map(creators.map((r) => [r.day, r]));
      const sMap = new Map(signups.map((r) => [r.day, r.n]));
      const series = [];
      for (let key = fromKey; key <= todayKey; key = addDaysKey(key, 1)) series.push({ day: key, activeCreators: cMap.get(key)?.n ?? 0, transactions: cMap.get(key)?.tx ?? 0, signups: sMap.get(key) ?? 0 });

      // Yangi va qaytgan: davr ichida yozuv qoʻshgan foydalanuvchilar, roʻyxatdan oʻtgan vaqtiga qarab.
      const split = one('SELECT sum(CASE WHEN u.created_at >= ?1 THEN 1 ELSE 0 END) AS fresh, sum(CASE WHEN u.created_at < ?1 THEN 1 ELSE 0 END) AS returning_users FROM users u WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id AND t.created_at >= ?1)', rangeStart);

      const features = one('SELECT (SELECT count(*) FROM transactions WHERE created_at >= ?1) AS transactions, (SELECT count(*) FROM budgets WHERE created_at >= ?1) AS budgets, (SELECT count(*) FROM goals WHERE created_at >= ?1) AS goals', rangeStart);

      const byTariff = all('SELECT u.plan AS id, count(DISTINCT u.id) AS users, count(t.id) AS transactions FROM users u LEFT JOIN transactions t ON t.user_id = u.id AND t.created_at >= ? GROUP BY u.plan ORDER BY users DESC', rangeStart);

      // Tarif cheklovlariga yaqinlik: bepul tarifdagi foydalanuvchilar byudjet/maqsad limitiga yetganmi.
      const limitRow = one("SELECT limits FROM tariffs WHERE id = 'free'");
      let limits = {};
      try { limits = JSON.parse(limitRow?.limits ?? '{}'); } catch { limits = {}; }
      const limitUsage = [];
      for (const [feature, table] of [['budgets', 'budgets'], ['goals', 'goals']]) {
        const max = limits[feature];
        if (!Number.isInteger(max)) continue;
        const r = one(`SELECT count(*) AS n FROM (SELECT u.id FROM users u LEFT JOIN ${table} x ON x.user_id = u.id WHERE u.plan = 'free' GROUP BY u.id HAVING count(x.id) >= ?)`, max);
        limitUsage.push({ feature, tariff: 'free', limit: max, usersAtLimit: r.n });
      }

      return {
        range: { from: fromKey, to: todayKey, days },
        activeUsers: { dau: active.dau ?? 0, wau: active.wau ?? 0, mau: active.mau ?? 0, neverActive: active.never ?? 0 },
        series,
        newVsReturning: { new: split.fresh ?? 0, returning: split.returning_users ?? 0 },
        features,
        byTariff,
        limitUsage,
      };
    },

    // ================= Tizim holati =================
    systemStats() {
      const pageCount = one('PRAGMA page_count')?.page_count ?? 0;
      const pageSize = one('PRAGMA page_size')?.page_size ?? 0;
      const tables = {};
      for (const name of ['users', 'sessions', 'transactions', 'budgets', 'goals', 'admins', 'admin_sessions', 'audit_log']) tables[name] = one(`SELECT count(*) AS n FROM ${name}`).n;
      return {
        dbOk: one('SELECT 1 AS ok').ok === 1,
        dbSizeBytes: pageCount * pageSize,
        migrations: one('SELECT count(*) AS n FROM _migrations').n,
        lastMigration: one('SELECT name FROM _migrations ORDER BY name DESC LIMIT 1')?.name ?? null,
        tables,
      };
    },

    registrationsSince: (iso, limit = 10) => all('SELECT id, name, created_at FROM users WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?', iso, limit).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
  };
}
