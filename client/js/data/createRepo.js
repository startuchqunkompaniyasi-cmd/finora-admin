/**
 * data/createRepo.js
 * Generic collection repository. transactionsRepo, budgetsRepo and goalsRepo
 * are all created from this, so CRUD + change notification is written once.
 */

import { getAdapter } from './adapters/index.js';
import { emit } from '../core/events.js';

export function createRepo(collection) {
  const notify = (action) => emit('data:changed', { collection, action });

  return {
    collection,

    list: () => getAdapter().list(collection),
    get: (id) => getAdapter().get(collection, id),

    async create(data) {
      const record = await getAdapter().create(collection, data);
      notify('create');
      return record;
    },

    async update(id, patch) {
      const record = await getAdapter().update(collection, id, patch);
      notify('update');
      return record;
    },

    async remove(id) {
      await getAdapter().remove(collection, id);
      notify('remove');
    },

    async replaceAll(items) {
      await getAdapter().replaceAll(collection, items);
      notify('replace');
    },

    async clear() {
      await getAdapter().clear(collection);
      notify('clear');
    },
  };
}
