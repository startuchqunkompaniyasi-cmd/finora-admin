/**
 * core/config.js
 * Single place for client-side runtime configuration.
 * NEVER put secrets here: everything in the browser is public.
 */

import { DEFAULT_TIMEZONE, DEFAULT_BASE_CURRENCY } from '../../../shared/constants.js';

export const config = Object.freeze({
  appName: 'Finora',
  /** 'local' = localStorage adapter, 'api' = REST adapter (Phase 8). */
  dataMode: 'local',
  apiBase: '/api/v1',
  storageVersion: 'v1',
  localUserId: 'local',
  locale: 'en-GB', // "20 Sep" style dates; number grouping is the same as en-US
  timezone: DEFAULT_TIMEZONE,
  baseCurrency: DEFAULT_BASE_CURRENCY,
  /** Show a skeleton only if a page needs longer than this (ms) to render. Avoids flicker. */
  skeletonDelayMs: 120,
  /** Plans are defined (shared/plans.js) but nothing is locked until billing exists (phase 7B). */
  enforcePlans: false,
  /** Rows rendered per "Show more" step in long lists. */
  pageSize: 40,
});
