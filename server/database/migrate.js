/**
 * database/migrate.js
 * Oddiy migratsiya bajaruvchi: `migrations/` papkasidagi `.sql` fayllarni fayl nomi tartibida,
 * hali qoʻllanilmaganlarini bitta tranzaksiya ichida bajaradi. Qoʻllangan fayllar `_migrations`
 * jadvalida qayd etiladi.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** @param {import('node:sqlite').DatabaseSync} db */
export function runMigrations(db) {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');

  const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((row) => row.name));
  const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`[finora] Migratsiya qoʻllandi: ${file}`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migratsiya "${file}" muvaffaqiyatsiz boʻldi: ${error.message}`);
    }
  }
}
