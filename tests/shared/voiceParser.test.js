import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpokenTransaction as parse } from '../../shared/voiceParser.js';

const cases = [
  ["Kecha taksiga 30 ming soʻm sarfladim", { amount: 30000, currency: 'UZS', type: 'expense', categoryId: 'transport', dayOffset: -1 }],
  ["Maosh tushdi 5 million 200 ming so'm", { amount: 5_200_000, type: 'income', categoryId: 'salary' }],
  ['bir yarim million soʻm oylik oldim', { amount: 1_500_000, type: 'income' }],
  ['tushlikka 45 000 soʻm', { amount: 45000, categoryId: 'food' }],
  ['3 ta non 15 ming soʻm', { amount: 15000 }],
  ["dorixonada 120.000 so'm", { amount: 120000, categoryId: 'health' }],
  ["bozordan ikki yuz ellik ming so'mlik mahsulot oldim", { amount: 250000, type: 'expense', categoryId: 'food' }],
  ['taksi 12 dollar', { amount: 12, currency: 'USD' }],
  ['$50 sovga', { amount: 50, currency: 'USD', categoryId: 'gifts' }],
  ['kafe 50k', { amount: 50000, currency: null }],
  ['30 минг сўм ресторан', { amount: 30000, currency: 'UZS', categoryId: 'food' }],
  ['yigirma besh ming', { amount: 25000 }],
];

for (const [text, expected] of cases) {
  test(`parser: ${text}`, () => {
    const result = parse(text);
    assert.equal(result.ok, true);
    for (const [key, value] of Object.entries(expected)) assert.equal(result[key], value, key);
  });
}

test('parser: summa yoʻq boʻlsa taxmin qilmaydi', () => {
  const result = parse('salom qalaysiz');
  assert.equal(result.ok, false);
  assert.equal(result.amount, null);
});

test('parser: tavsif uzunligi chegaralangan', () => {
  assert.ok(parse(`taksi 10 ming ${'a'.repeat(300)}`).description.length <= 120);
});
