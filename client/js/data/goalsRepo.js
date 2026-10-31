/**
 * data/goalsRepo.js
 *
 * Maqsad shakli (`goals` jadvaliga mos):
 * { id, name, targetAmount, currentAmount: minor birlik, deadline: 'YYYY-MM-DD'|null, createdAt, updatedAt }
 * `status` saqlanmaydi — currentAmount >= targetAmount asosida oʻqishda hisoblanadi (shared/goals.js).
 */

import { createRepo } from './createRepo.js';

export const goalsRepo = createRepo('goals');
