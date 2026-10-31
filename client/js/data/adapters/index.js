/**
 * data/adapters/index.js
 * Adapter tanlovi SESSIYA HOLATIGA qarab DINAMIK: hisobga kirilgan boʻlsa `api`, aks holda
 * `local`. Repozitoriylar har chaqiruvda `getAdapter()`ni qayta soʻraydi (keshlamaydi), shuning
 * uchun kirish/chiqish darhol — sahifani qayta yuklamasdan — toʻgʻri manbaga oʻtkazadi.
 */

import { createLocalAdapter } from './localAdapter.js';
import { createApiAdapter } from './apiAdapter.js';
import { store } from '../../core/store.js';

let localSingleton;
let apiSingleton;

export function getAdapter() {
  if (store.get('session')) {
    apiSingleton ??= createApiAdapter();
    return apiSingleton;
  }
  localSingleton ??= createLocalAdapter();
  return localSingleton;
}

/** Faqat mahalliy maʼlumotni oʻqish kerak boʻlgan joylar uchun (masalan: import qilishdan oldin,
 * hali sessiya yangi oʻrnatilgan boʻlsa ham "bu qurilmadagi eski" maʼlumotni olish uchun). */
export function getLocalAdapter() {
  localSingleton ??= createLocalAdapter();
  return localSingleton;
}
