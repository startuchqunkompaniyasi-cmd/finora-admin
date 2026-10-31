-- 0003_admin.sql
-- Administrator paneli: adminlar, ularning sessiyalari, kirish urinishlari, append-only audit jurnali,
-- tariflar (narx tarixi bilan) va sayt sozlamalari. Mavjud jadvallar buzilmaydi: users jadvaliga faqat
-- ikkita yangi ustun qo'shiladi (hisob holati va oxirgi faollik).

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE users ADD COLUMN last_active_at TEXT;

-- Adminlar ALOHIDA jadvalda: oddiy foydalanuvchi hisobi hech qachon admin bo'la olmaydi.
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'viewer')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,            -- xom token saqlanmaydi, faqat SHA-256 xeshi
  user_agent TEXT,
  ip TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);

CREATE TABLE admin_login_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT,
  username TEXT NOT NULL,
  success INTEGER NOT NULL,
  reason TEXT,                                -- 'bad_credentials' | 'locked' | null
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_admin_login_events_created ON admin_login_events(created_at);

-- Append-only audit jurnali. Triggerlar UPDATE va DELETE ni bazaning o'zida taqiqlaydi.
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  reason TEXT,
  result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failure')),
  details TEXT,                               -- JSON: faqat oldin/keyin qiymatlari, sirlarsiz
  ip TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_action ON audit_log(action);

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log faqat qoʻshiladi (append-only)'); END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log faqat qoʻshiladi (append-only)'); END;

-- Tariflar. `id` users.plan qiymati bilan mos (free / premium / mega yoki admin yaratgan yangi id).
CREATE TABLE tariffs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),   -- UZS, minor birlik (x100)
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('daily', 'monthly', 'yearly')),
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  limits TEXT NOT NULL DEFAULT '{}',          -- JSON: { "budgets": 3, "goals": 2 } (null = cheksiz)
  is_active INTEGER NOT NULL DEFAULT 1,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tariff_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tariff_id TEXT NOT NULL,
  old_price_minor INTEGER,
  new_price_minor INTEGER NOT NULL,
  old_billing_period TEXT,
  new_billing_period TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tariff_history_tariff ON tariff_price_history(tariff_id);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                        -- JSON
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
