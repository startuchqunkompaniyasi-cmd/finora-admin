/**
 * data/categoriesRepo.js
 * System categories come from shared/constants.js. Custom categories (later phase)
 * are stored in the 'categories' collection and merged in here.
 */

import { SYSTEM_CATEGORIES } from '../../../shared/constants.js';
import { createRepo } from './createRepo.js';

const customCategories = createRepo('categories');

export const categoriesRepo = {
  async list() {
    return [...SYSTEM_CATEGORIES, ...(await customCategories.list())];
  },

  /** Map keyed by id; unknown ids resolve to the "other" category so rows never break. */
  async byId() {
    const list = await this.list();
    const map = new Map(list.map((category) => [category.id, category]));
    const fallback = map.get('other');
    return { get: (id) => map.get(id) ?? fallback, list };
  },
};
