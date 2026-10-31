import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../../server/services/passwordService.js';

test('hashPassword: har chaqiriqda boshqa tuz (bir xil parol -> boshqa xesh)', async () => {
  const a = await hashPassword('mening-parolim-123');
  const b = await hashPassword('mening-parolim-123');
  assert.notEqual(a, b);
  assert.match(a, /^scrypt:16384:8:1:[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('verifyPassword: toʻgʻri parol true, notoʻgʻri false qaytaradi', async () => {
  const hash = await hashPassword('toʻgʻri-parol');
  assert.equal(await verifyPassword('toʻgʻri-parol', hash), true);
  assert.equal(await verifyPassword('notoʻgʻri-parol', hash), false);
  assert.equal(await verifyPassword('', hash), false);
});

test('verifyPassword: notoʻgʻri formatdagi xesh xato tashlamaydi, false qaytaradi', async () => {
  assert.equal(await verifyPassword('parol', 'buzilgan-format'), false);
  assert.equal(await verifyPassword('parol', ''), false);
});
