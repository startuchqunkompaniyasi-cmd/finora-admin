/**
 * database/db.js
 * SQLite ulanishi: Node'ning oʻrnatilgan `node:sqlite` moduli orqali (Node 22.5+).
 *
 * NEGA `better-sqlite3` YOKI boshqa paket emas: `node:sqlite` Node'ning oʻzida keladi — hech qanday
 * native kompilyatsiya, npm paketi yoki tarmoq orqali prebuilt binary yuklab olish shart emas.
 * `npm install` shu qadar sodda va ishonchli boʻlishi uchun bu muhim edi. API'si `better-sqlite3`
 * bilan deyarli bir xil (sinxron, `prepare().run()/.get()/.all()`), shuning uchun kelajakda kerak
 * boʻlsa almashtirish qiyin emas. Yagona kamchilik: hozircha "experimental" deb belgilangan
 * (`database/silenceExperimentalWarning.js` shu haqidagi ogohlantirishni bostiradi).
 */

import './silenceExperimentalWarning.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { runMigrations } from './migrate.js';

let instance = null;

/** @returns {DatabaseSync} */
export function getDb() {
  if (instance) return instance;

  mkdirSync(path.dirname(env.database.path), { recursive: true });
  instance = new DatabaseSync(env.database.path);
  instance.exec('PRAGMA journal_mode = WAL');
  instance.exec('PRAGMA foreign_keys = ON');
  runMigrations(instance);
  return instance;
}

/** Faqat testlar uchun: xotiradagi (`:memory:`) alohida bazani ochadi, migratsiyalarni oʻtkazadi. */
export function createTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  runMigrations(db);
  return db;
}
