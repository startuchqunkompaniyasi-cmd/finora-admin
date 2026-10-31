-- 0001_init.sql
-- Foydalanuvchilar va sessiyalar. Tranzaksiya/kategoriya/byudjet/maqsad jadvallari 8-bosqichda
-- qoʻshiladi (hozircha ular localStorage'da).

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,               -- har doim kichik harfda saqlanadi (registerUser() da)
  password_hash TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'UZS' CHECK (base_currency IN ('UZS', 'USD')),
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,          -- xom token hech qachon saqlanmaydi, faqat SHA-256 xeshi
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
