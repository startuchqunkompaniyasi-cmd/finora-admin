/**
 * services/importService.js
 * Roʻyxatdan oʻtishda BIR MARTA ishga tushadi: shu qurilmadagi mahalliy maʼlumotni (agar bor
 * boʻlsa) yangi hisobga koʻchiradi.
 *
 * MUHIM QOIDALAR:
 *  - Faqat ROʻYXATDAN OʻTISHDA chaqiriladi, hech qachon KIRISHDA emas — aks holda boshqa
 *    (mavjud) hisobga kirganingizda bu qurilmaning bevosita aloqasi boʻlmagan mahalliy
 *    maʼlumotlari tasodifan sizning haqiqiy hisobingizga aralashib ketishi mumkin edi.
 *  - Demo (`isDemo: true`) tranzaksiyalar HECH QACHON koʻchirilmaydi — ular sizniki emas,
 *    faqat sinab koʻrish uchun namunalar edi.
 *  - Mahalliy maʼlumot hech qachon oʻchirilmaydi (faqat NUSXALANADI serverga). Agar keyinroq
 *    chiqib ketsangiz, bu qurilmadagi eski mehmon maʼlumoti oʻzgarishsiz qaytadi.
 */

import { getLocalAdapter } from '../data/adapters/index.js';
import { config } from '../core/config.js';
import { withCsrfHeader } from '../utils/csrf.js';

const PROFILE_KEYS = ['baseCurrency', 'timezone', 'openingBalance', 'onboardedAt', 'hasDemoData', 'demoSeededAt'];

function stripTransaction(tx) {
  const { id, createdAt, updatedAt, isDemo, ...rest } = tx;
  return rest;
}

function stripRecord(record) {
  const { id, createdAt, updatedAt, ...rest } = record;
  return rest;
}

/** @returns {Promise<{transactions:number, budgets:number, goals:number}|null>} hech narsa koʻchirilmasa `null`. */
export async function importLocalDataToAccount() {
  const adapter = getLocalAdapter();
  const [rawTransactions, rawBudgets, rawGoals, rawProfile] = await Promise.all([
    adapter.list('transactions'),
    adapter.list('budgets'),
    adapter.list('goals'),
    adapter.getDocument('profile', {}),
  ]);

  const transactions = rawTransactions.filter((tx) => !tx.isDemo).map(stripTransaction);
  const budgets = rawBudgets.map(stripRecord);
  const goals = rawGoals.map(stripRecord);

  if (transactions.length === 0 && budgets.length === 0 && goals.length === 0) return null;

  const profilePatch = Object.fromEntries(PROFILE_KEYS.filter((key) => rawProfile[key] !== undefined).map((key) => [key, rawProfile[key]]));

  const response = await fetch(`${config.apiBase}/import`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }, 'POST'),
    body: JSON.stringify({ transactions, budgets, goals, profile: profilePatch }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  return body.data;
}
