/**
 * core/events.js
 * Minimal event bus. Repositories emit 'data:changed' after a mutation so the current
 * page can refresh itself without every form knowing which page is open.
 */

const listeners = new Map();

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(handler);
  return () => listeners.get(eventName)?.delete(handler);
}

export function emit(eventName, payload) {
  for (const handler of listeners.get(eventName) ?? []) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[finora] Listener for "${eventName}" failed`, error);
    }
  }
}
