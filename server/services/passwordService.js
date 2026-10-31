/**
 * services/passwordService.js
 * Parolni xeshlash: Node'ning oʻrnatilgan `crypto.scrypt` orqali (asinxron, xotira-qiyin KDF).
 *
 * NEGA `argon2` emas: `argon2` paketi native (C++) bogʻlanish talab qiladi — kompilyatsiya
 * vositalari yoki tarmoq orqali prebuilt binary yuklab olishga bogʻliq boʻladi. `crypto.scrypt`
 * Node'ning oʻzida keladi, hech qanday qoʻshimcha bogʻliqlik yoki oʻrnatish xavfi yoʻq, va
 * OWASP tomonidan parol xeshlash uchun tan olingan xotira-qiyin algoritm. Xotira parametri
 * (N=16384) va tuz (salt) har parol uchun alohida — lugʻat va rainbow-table hujumlaridan himoya.
 *
 * Saqlanadigan format: "scrypt:N:r:p:tuzHex:xeshHex" — parametrlar keyinchalik oshirilsa ham,
 * eski parollar hali toʻgʻri tekshiriladi (parametrlar xeshning oʻzida saqlanadi).
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 };

export async function hashPassword(plainPassword) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plainPassword, salt, PARAMS.keyLength, { N: PARAMS.N, r: PARAMS.r, p: PARAMS.p });
  return `scrypt:${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** @returns {Promise<boolean>} */
export async function verifyPassword(plainPassword, stored) {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scryptAsync(plainPassword, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
  });

  // Vaqt-xavfsiz solishtirish: oddiy `===` parolning qaysi belgisi notoʻgʻriligini vaqt orqali
  // sizib chiqarishi mumkin (timing attack).
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
