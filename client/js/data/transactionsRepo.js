/**
 * data/transactionsRepo.js
 *
 * Transaction shape (mirrors the `transactions` table):
 * {
 *   id, type: 'income'|'expense',
 *   amount: integer minor units (x100), currency: 'UZS'|'USD',
 *   fxRateToBase: number|null   // base-currency value of 1 unit of `currency` when created
 *   categoryId, description, note, paymentMethod,
 *   occurredAt: ISO 8601 UTC string (date + time), createdAt, updatedAt
 * }
 */

import { createRepo } from './createRepo.js';

export const transactionsRepo = createRepo('transactions');
