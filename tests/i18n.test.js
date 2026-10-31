/**
 * tests/i18n.test.js
 * Til butunligini himoya qiladi:
 *  1. kodda ishlatilgan har bir tarjima kaliti lugʻatda bor;
 *  2. lugʻatda ishlatilmayotgan (eskirgan) kalit yoʻq;
 *  3. imlo: oʻ va gʻ uchun ʻ (U+02BB), tutuq uchun ʼ (U+02BC); oddiy ' ishlatilmaydi;
 *  4. barcha {oʻrin} belgilari kodda beriladigan oʻzgaruvchilarga mos (shablon buzilmagan).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uz from '../client/js/i18n/uz.js';

const clientJs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/js');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.js') && !full.endsWith(path.join('i18n', 'uz.js')) ? [full] : [];
  });
}

const prefixes = new Set(Object.keys(uz).map((key) => key.split('.')[0]));
const source = sourceFiles(clientJs).map((file) => readFileSync(file, 'utf8')).join('\n');

// 'nav.dashboard' koʻrinishidagi har bir qatʼiy kalit (labelKey, titleKey, t('...') va h.k.)
const literalKeys = new Set([...source.matchAll(/['"`]([a-z][a-zA-Z]*(?:\.[a-zA-Z0-9]+)+)['"`]/g)].map((m) => m[1]).filter((key) => prefixes.has(key.split('.')[0]) && !/\.js$/.test(key)));

// Dinamik kalitlar t(`payment.${method}`) kabi: qiymatlar toʻplamini shu yerda sanab chiqamiz.
const dynamicKeys = [
  ...['cash', 'card', 'bank', 'other'].map((v) => `payment.${v}`),
  ...['month', '30d', 'year', 'all'].map((v) => `period.${v}`),
  ...['light', 'dark', 'system'].map((v) => `theme.${v}`),
  ...['morning', 'afternoon', 'evening'].map((v) => `greeting.${v}`),
  ...['daily', 'monthly', 'yearly'].map((v) => `plans.period.${v}`),
  ...['budgets', 'goals'].flatMap((v) => [`plans.limit.${v}`, `plans.limit.${v}Unlimited`]),
];

test('kodda ishlatilgan har bir kalit lugʻatda mavjud', () => {
  const missing = [...literalKeys, ...dynamicKeys].filter((key) => !(key in uz));
  assert.deepEqual(missing, [], `Lugʻatda yoʻq: ${missing.join(', ')}`);
});

test('lugʻatda ishlatilmayotgan (eskirgan) kalit yoʻq', () => {
  const used = new Set([...literalKeys, ...dynamicKeys]);
  const unused = Object.keys(uz).filter((key) => !used.has(key));
  assert.deepEqual(unused, [], `Ishlatilmaydi: ${unused.join(', ')}`);
});

test('imlo: oddiy apostrof (o\' g\' ta\'lim) ishlatilmagan', () => {
  const bad = Object.entries(uz).filter(([, value]) => /[a-zA-Z]'[a-zA-Z]|[oOgG]['’‘`]/.test(value));
  assert.deepEqual(bad.map(([key]) => key), [], 'oʻ/gʻ uchun ʻ, tutuq uchun ʼ ishlating');
});

test('shablon oʻrinlari faqat {soʻz} koʻrinishida, boʻsh qiymat yoʻq', () => {
  for (const [key, value] of Object.entries(uz)) {
    assert.ok(value.trim().length > 0, `${key} boʻsh`);
    assert.ok(!/\{[^}\w]|\{\}|\{\w+$/.test(value), `${key}: shablon buzilgan`);
  }
});
