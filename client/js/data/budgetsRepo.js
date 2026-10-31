/**
 * data/budgetsRepo.js
 *
 * Byudjet shakli (`budgets` jadvaliga mos):
 * { id, categoryId, period: 'weekly'|'monthly', limitAmount: minor birlik, createdAt, updatedAt }
 */

import { createRepo } from './createRepo.js';

export const budgetsRepo = createRepo('budgets');
