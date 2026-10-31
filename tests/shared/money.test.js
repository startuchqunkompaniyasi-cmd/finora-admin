import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinor, convertMinor, toBaseMinor } from '../../shared/money.js';

test('toMinor parses valid amounts without float drift', () => {
  assert.equal(toMinor('0.29'), 29);
  assert.equal(toMinor('1 250 000'), 125000000);
  assert.equal(toMinor('1,250.5'), 125050);
  assert.equal(toMinor(19.99), 1999);
});

test('toMinor rejects invalid input', () => {
  for (const bad of ['', 'abc', '-5', '1.234', null, undefined, NaN, -1]) {
    assert.ok(Number.isNaN(toMinor(bad)), `expected NaN for ${String(bad)}`);
  }
});

test('convertMinor: 100 USD at 12,500 = 1,250,000 UZS', () => {
  assert.equal(convertMinor(toMinor('100'), 12500), toMinor('1250000'));
});

test('toBaseMinor uses the rate stored on the transaction', () => {
  const tx = { id: 't1', amount: toMinor('250'), currency: 'USD', fxRateToBase: 12000 };
  assert.equal(toBaseMinor(tx, 'UZS'), toMinor('3000000'));
  assert.equal(toBaseMinor({ ...tx, currency: 'UZS' }, 'UZS'), tx.amount);
});
