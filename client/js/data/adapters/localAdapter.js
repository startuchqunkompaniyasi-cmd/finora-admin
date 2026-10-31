/**
 * data/adapters/localAdapter.js
 * localStorage implementation of the data-source interface:
 *
 *   list / get / create / update / remove / replaceAll / clear   (collections)
 *   getDocument / setDocument                                    (single documents, e.g. profile)
 *
 * The future apiAdapter (Phase 8) implements the exact same interface over REST,
 * so repositories, services and pages never know where the data lives.
 * Keys are namespaced per user: finora:v1:{userId}:{collection}
 */

import { config } from '../../core/config.js';
import { createId } from '../../utils/id.js';

/** localStorage can be blocked (private mode, disabled cookies). Fall back to memory, loudly. */
function resolveStorage() {
  try {
    const probe = '__finora_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (error) {
    console.warn('[finora] localStorage is unavailable; data will NOT persist after refresh.', error);
    const memory = new Map();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
  }
}

export function createLocalAdapter({ userId = config.localUserId, storage = resolveStorage() } = {}) {
  const storageKey = (name) => `finora:${config.storageVersion}:${userId}:${name}`;

  function read(name, fallback) {
    try {
      const raw = storage.getItem(storageKey(name));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.error(`[finora] Stored data "${name}" is unreadable, using fallback.`, error);
      return fallback;
    }
  }

  function write(name, value) {
    try {
      storage.setItem(storageKey(name), JSON.stringify(value));
    } catch (error) {
      console.error(`[finora] Failed to save "${name}" (storage full?)`, error);
      throw new Error('Unable to save your data on this device.');
    }
  }

  return {
    mode: 'local',

    async list(collection) {
      return read(collection, []);
    },

    async get(collection, id) {
      return read(collection, []).find((item) => item.id === id) ?? null;
    },

    async create(collection, data) {
      const now = new Date().toISOString();
      const record = { id: createId(), createdAt: now, updatedAt: now, ...data };
      write(collection, [...read(collection, []), record]);
      return record;
    },

    async update(collection, id, patch) {
      const items = read(collection, []);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) throw new Error(`${collection} item not found`);
      const record = { ...items[index], ...patch, id, updatedAt: new Date().toISOString() };
      items[index] = record;
      write(collection, items);
      return record;
    },

    async remove(collection, id) {
      write(collection, read(collection, []).filter((item) => item.id !== id));
    },

    async replaceAll(collection, items) {
      write(collection, items);
    },

    async clear(collection) {
      write(collection, []);
    },

    async getDocument(name, fallback) {
      return read(name, fallback);
    },

    async setDocument(name, value) {
      write(name, value);
      return value;
    },
  };
}
