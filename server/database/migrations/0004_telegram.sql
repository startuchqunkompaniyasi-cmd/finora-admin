-- 0004_telegram.sql
-- Telegram bot: foydalanuvchi hisobini Telegram chat bilan bogʻlash.
CREATE TABLE telegram_links (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  linked_at TEXT NOT NULL
);

-- Bir martalik ulash kodlari. Xom kod saqlanmaydi, faqat SHA-256 xeshi.
CREATE TABLE telegram_link_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_telegram_codes_user ON telegram_link_codes(user_id);
