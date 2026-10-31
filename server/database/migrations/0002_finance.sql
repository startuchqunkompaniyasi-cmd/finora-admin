-- 0002_finance.sql
-- Tranzaksiyalar, byudjetlar, maqsadlar va foydalanuvchi moliyaviy sozlamalari.
--
-- Kategoriyalar uchun ALOHIDA jadval yo'q: tizim kategoriyalari shared/constants.js da (kod
-- ichida), ular hech qachon o'zgarmaydi. Moslashuvchan (custom) kategoriya qo'shish uchun UI
-- hali yo'q (hech kim ishlatmaydi), shuning uchun bo'sh jadval qo'shish o'rniga API /categories
-- hozircha oddiy bo'sh ro'yxat qaytaradi — kerak bo'lganda jadval qo'shish oson.

ALTER TABLE users ADD COLUMN opening_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN onboarded_at TEXT;
ALTER TABLE users ADD COLUMN has_demo_data INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN demo_seeded_at TEXT;

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),      -- minor birlik (x100)
  currency TEXT NOT NULL CHECK (currency IN ('UZS', 'USD')),
  fx_rate_to_base REAL,
  fx_rate_source TEXT,
  category_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank', 'other')),
  occurred_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, occurred_at);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  limit_amount INTEGER NOT NULL CHECK (limit_amount > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, category_id, period)
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  current_amount INTEGER NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_goals_user ON goals(user_id);
