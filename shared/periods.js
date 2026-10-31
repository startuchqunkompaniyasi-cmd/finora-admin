/**
 * shared/periods.js
 * Named date ranges used by Categories now and Statistics later.
 */

import { addDays, startOfMonth } from './dates.js';

export const PERIODS = Object.freeze(['month', '30d', 'year', 'all']);

/** @returns {{from:string, to:string}} day keys; empty strings mean "unbounded". */
export function resolvePeriod(period, today) {
  switch (period) {
    case 'month':
      return { from: startOfMonth(today), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: '', to: '' };
  }
}
