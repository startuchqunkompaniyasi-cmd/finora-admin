/**
 * server/config/env.js
 * Reads configuration from environment variables (optionally from a local .env file).
 * Secrets belong here and ONLY here: never in client code, never committed to git.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = path.join(rootDir, '.env');

// Node >= 20.12 can load .env natively, so no dotenv dependency is needed.
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

function readPort(value, fallback) {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${value}". Use an integer between 1 and 65535.`);
  }
  return port;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: readPort(process.env.PORT, 3000),
  paths: Object.freeze({
    root: rootDir,
    client: path.join(rootDir, 'client'),
    shared: path.join(rootDir, 'shared'),
    chartJs: path.join(rootDir, 'node_modules', 'chart.js', 'dist'),
    jspdf: path.join(rootDir, 'node_modules', 'jspdf', 'dist'),
    jspdfAutotable: path.join(rootDir, 'node_modules', 'jspdf-autotable', 'dist'),
  }),
  exchange: Object.freeze({
    // Ixtiyoriy ikkilamchi provayder (masalan exchangerate.host) kaliti. Kod ichida hech qachon yozilmaydi.
    secondaryApiKey: process.env.EXCHANGE_SECONDARY_API_KEY || null,
  }),
  database: Object.freeze({
    path: process.env.DATABASE_PATH || path.join(rootDir, 'server', 'data', 'finora.db'),
  }),
  auth: Object.freeze({
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS) > 0 ? Number(process.env.SESSION_TTL_DAYS) : 30,
    // Ishlab chiqarishda cookie faqat HTTPS orqali yuboriladi. Lokalda (http://localhost) buni yoqish
    // brauzerni cookie'ni butunlay rad etishga majbur qiladi, shuning uchun aniq soʻralmagunча oʻchiq.
    cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  }),
  admin: Object.freeze({
    // Birinchi ishga tushirishda (adminlar jadvali boʻsh boʻlsa) shu qiymatlardan BITTA admin yaratiladi.
    // Parol bazaga faqat xesh sifatida yoziladi; bu qiymatlar hech qachon klientga chiqmaydi.
    bootstrapUsername: process.env.ADMIN_BOOTSTRAP_USERNAME || null,
    bootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || null,
    sessionTtlHours: Number(process.env.ADMIN_SESSION_TTL_HOURS) > 0 ? Number(process.env.ADMIN_SESSION_TTL_HOURS) : 8,
    idleTimeoutMinutes: Number(process.env.ADMIN_IDLE_TIMEOUT_MINUTES) > 0 ? Number(process.env.ADMIN_IDLE_TIMEOUT_MINUTES) : 60,
    maxFailedAttempts: 5,
    lockMinutes: 15,
  }),
  telegram: Object.freeze({
    // Bot tokeni @BotFather dan olinadi. Boʻsh boʻlsa bot oʻchiq (sayt odatdagidek ishlayveradi).
    botToken: process.env.TELEGRAM_BOT_TOKEN || null,
    botUsername: (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '') || null,
  }),
  speech: Object.freeze({
    // Ovozni matnga aylantirish (OpenAI Whisper). Kalit boʻlmasa bot faqat matnli xabarni tushunadi.
    openaiApiKey: process.env.OPENAI_API_KEY || null,
    model: process.env.STT_MODEL || 'whisper-1',
    language: process.env.STT_LANGUAGE || 'uz',
  }),
  rateLimit: Object.freeze({
    // login/registratsiya kabi hujumga ochiq endpointlar uchun: bitta IP shu oyna ichida
    // nechta urinish qila oladi.
    authWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) > 0 ? Number(process.env.RATE_LIMIT_WINDOW_MS) : 15 * 60_000,
    authMax: Number(process.env.RATE_LIMIT_MAX) > 0 ? Number(process.env.RATE_LIMIT_MAX) : 10,
  }),
});
