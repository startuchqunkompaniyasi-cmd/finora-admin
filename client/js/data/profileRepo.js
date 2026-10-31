/**
 * data/profileRepo.js
 * Single-document profile. In Phase 7 this maps to the `users` row.
 */

import { getAdapter } from './adapters/index.js';
import { emit } from '../core/events.js';
import { config } from '../core/config.js';

const DOCUMENT = 'profile';

export const DEFAULT_PROFILE = Object.freeze({
  name: '',
  email: '',
  baseCurrency: config.baseCurrency,
  /** Subscription tier id from shared/plans.js. Becomes server-owned in phase 7B. */
  plan: 'free',
  timezone: config.timezone,
  avatarUrl: '',
  /** Money the user already had before tracking, in base-currency minor units. Counts towards balance only, never income. */
  openingBalance: 0,
  onboardedAt: null,
  /** true while the sample transactions are on screen */
  hasDemoData: false,
  /** set once the sample data was generated, so clearing it never brings it back */
  demoSeededAt: null,
});

export const profileRepo = {
  async get() {
    return { ...DEFAULT_PROFILE, ...(await getAdapter().getDocument(DOCUMENT, {})) };
  },

  async update(patch) {
    const next = { ...(await this.get()), ...patch };
    await getAdapter().setDocument(DOCUMENT, next);
    emit('data:changed', { collection: DOCUMENT, action: 'update' });
    return next;
  },
};
