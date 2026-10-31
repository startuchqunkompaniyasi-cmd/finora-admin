/**
 * tests/adminI18n.test.js - admin lugʻati: ishlatilgan kalit bor, ishlatilmagan kalit yoʻq, imlo, shablon.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uz from '../client/js/admin/uz.js';
import { createClickCounter } from '../client/js/admin/secretTrigger.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/js/admin');
const files = (d) => readdirSync(d).flatMap((n) => { const f = path.join(d, n); return statSync(f).isDirectory() ? files(f) : f.endsWith('.js') && !f.endsWith('uz.js') ? [f] : []; });
const source = files(dir).map((f) => readFileSync(f, 'utf8')).join('\n');
const used = new Set([...source.matchAll(/['"`](adm\.[A-Za-z0-9_.]+)['"`]/g)].map((m) => m[1]));
const dynamic = [
  ...['daily', 'monthly', 'yearly'].map((v) => `adm.period.${v}`), ...['active', 'suspended'].map((v) => `adm.status.${v}`),
  ...['income', 'expense'].map((v) => `adm.type.${v}`), ...['budgets', 'goals'].map((v) => `adm.an.f.${v}`),
  ...Object.keys(uz).filter((k) => k.startsWith('adm.action.')),
];

test('admin: ishlatilgan kalitlarning hammasi lugʻatda bor', () => {
  assert.deepEqual([...used, ...dynamic].filter((k) => !(k in uz)), []);
});
test('admin: lugʻatda ishlatilmayotgan kalit yoʻq', () => {
  const all = new Set([...used, ...dynamic]);
  assert.deepEqual(Object.keys(uz).filter((k) => !all.has(k)), []);
});
test('admin: imlo (oddiy apostrof yoʻq) va shablonlar butun', () => {
  for (const [k, v] of Object.entries(uz)) {
    assert.ok(!/[a-zA-Z]'[a-zA-Z]|[oOgG]['’‘`]/.test(v), `${k}: apostrof`);
    assert.ok(!/\{[^}\w]|\{\}|\{\w+$/.test(v), `${k}: shablon`);
  }
});
test('yashirin kirish: 5 ketma-ket bosish ochadi, uzun tanaffus hisoblagichni nolga tushiradi', () => {
  const c = createClickCounter({ target: 5, resetMs: 900 });
  assert.deepEqual([0, 100, 200, 300].map((t) => c.press(t)), [false, false, false, false]);
  assert.equal(c.press(400), true);
  assert.equal(c.press(500), false, 'ochilgandan keyin qayta boshlanadi');
  const d = createClickCounter({ target: 5, resetMs: 900 });
  [0, 100, 200, 300].forEach((t) => d.press(t));
  assert.equal(d.press(1500), false, 'tanaffusdan keyin 1-bosish');
  [1600, 1700, 1800].forEach((t) => d.press(t));
  assert.equal(d.press(1900), true);
});
