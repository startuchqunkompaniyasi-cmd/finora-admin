import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTransactionsCsv, buildBackupJson, neutralizeFormula, buildTransactionsPdfRows, EXPORT_FORMATS, CSV_COLUMNS } from '../../shared/exportFormats.js';
import { planIncludes, featuresForPlan, PLAN_IDS, PLANS } from '../../shared/plans.js';

const base = { id: '1', type: 'expense', amount: 4_500_000, currency: 'UZS', categoryId: 'food', description: 'Lunch, "big" one', note: '', paymentMethod: 'cash', occurredAt: '2026-09-20T07:30:00.000Z', fxRateToBase: null };
const options = { categoryName: () => 'Food', baseCurrency: 'UZS', timezone: 'Asia/Tashkent' };

test('CSV: header, local date/time, decimal amounts, quoting', () => {
  const csv = buildTransactionsCsv({ transactions: [base], ...options });
  const lines = csv.replace('\uFEFF', '').trimEnd().split('\r\n');
  assert.equal(lines[0], CSV_COLUMNS.join(','));
  assert.equal(lines[1], '2026-09-20,12:30,Chiqim,45000.00,UZS,45000.00,UZS,Food,"Lunch, ""big"" one",Naqd,,1');
  assert.ok(lines[0].startsWith('Sana,Vaqt,Turi,Summa'), 'Uzbek header');
  assert.ok(csv.startsWith('\uFEFF'));
});

test('CSV: formula injection is neutralised', () => {
  assert.equal(neutralizeFormula('=HYPERLINK("http://evil")'), `'=HYPERLINK("http://evil")`);
  assert.equal(neutralizeFormula('+1'), `'+1`);
  assert.equal(neutralizeFormula('Lunch'), 'Lunch');
  const csv = buildTransactionsCsv({ transactions: [{ ...base, description: '=cmd|calc' }], ...options });
  assert.ok(csv.includes(`'=cmd|calc`));
});

test('JSON backup keeps minor units and drops derived fields', () => {
  const json = JSON.parse(buildBackupJson({ profile: { name: 'A', baseCurrency: 'UZS', timezone: 'Asia/Tashkent', openingBalance: 0 }, transactions: [{ ...base, dayKey: '2026-09-20' }], exportedAt: new Date('2026-09-20T10:00:00Z') }));
  assert.equal(json.transactions[0].amount, 4_500_000);
  assert.ok(!('dayKey' in json.transactions[0]));
  assert.equal(json.formatVersion, 1);
});

test('PDF (10-bosqich): sof qator maʼlumoti toʻgʻri tayyorlanadi (DOM kerak emas)', () => {
  const { columns, rows } = buildTransactionsPdfRows({ transactions: [base, { ...base, id: '2', type: 'income', amount: 5_000_000, description: '' }], ...options });
  assert.deepEqual(columns, ['Sana', 'Turi', 'Summa', 'Kategoriya', 'Tavsif', 'Toʻlov usuli']);
  assert.equal(rows.length, 2);
  assert.equal(rows[0][1], 'Chiqim');
  assert.equal(rows[0][2], '-45000.00 UZS');
  assert.equal(rows[1][1], 'Kirim');
  assert.equal(rows[1][2], '+50000.00 UZS');
  assert.equal(rows[1][4], '—', 'boʻsh tavsif tireга almashtiriladi');
});

test('eksport roʻyxatida (EXPORT_FORMATS) endi pdf ham bor', () => {
  assert.ok(EXPORT_FORMATS.pdf, 'pdf formati roʻyxatdan oʻrin olishi kerak');
  assert.equal(EXPORT_FORMATS.pdf.extension, 'pdf');
});

test('plans: inheritance builds the full feature list', () => {
  assert.deepEqual(PLAN_IDS, ['free', 'premium', 'mega']);
  assert.ok(planIncludes('mega', 'transactions'));
  assert.ok(planIncludes('premium', 'insights'));
  assert.ok(!planIncludes('free', 'insights'));
  assert.ok(featuresForPlan('mega').length > featuresForPlan('premium').length);
  assert.deepEqual(PLAN_IDS.map((id) => PLANS[id].name), ['Bepul', 'Premium', 'Mega Premium']);
});
