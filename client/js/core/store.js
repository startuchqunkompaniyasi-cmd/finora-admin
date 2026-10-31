/**
 * core/store.js
 * Small key/value store with subscriptions for UI-wide state
 * (resolved theme, profile, base currency). Domain data lives in repositories, not here.
 */

const state = new Map();
const subscribers = new Map();

export const store = {
  get(key, fallback) {
    return state.has(key) ? state.get(key) : fallback;
  },

  set(key, value) {
    if (Object.is(state.get(key), value)) return;
    state.set(key, value);
    for (const handler of subscribers.get(key) ?? []) handler(value);
  },

  /** @returns {() => void} unsubscribe */
  subscribe(key, handler) {
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(handler);
    return () => subscribers.get(key).delete(handler);
  },
};
