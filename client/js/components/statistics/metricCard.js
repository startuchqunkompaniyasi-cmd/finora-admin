/**
 * components/statistics/metricCard.js
 * Bitta koʻrsatkich: nomi, qiymati va izohi. Rang faqat qiymatga taʼsir qiladi va belgi (+/−) bilan birga keladi.
 */

import { h } from '../../core/dom.js';

/** @param {{label:string, value:string, hint?:string, tone?:'positive'|'negative'}} o */
export function metricCard({ label, value, hint, tone }) {
  return h(
    'div',
    { class: 'metric card' },
    h('p', { class: 'metric__label' }, label),
    h('p', { class: ['metric__value', 'num', tone === 'positive' && 'is-positive', tone === 'negative' && 'is-negative'] }, value),
    hint ? h('p', { class: 'metric__hint' }, hint) : null
  );
}

export function metricGrid(cards) {
  return h('div', { class: 'metrics' }, cards);
}

/** Summaning ishorasiga qarab ohang: musbat -> positive, manfiy -> negative. */
export const toneOf = (amount) => (amount > 0 ? 'positive' : amount < 0 ? 'negative' : undefined);
