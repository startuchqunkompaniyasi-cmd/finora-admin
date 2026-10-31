/**
 * components/legend.js
 * Grafik uchun izoh: rang belgisi, nom va (ixtiyoriy) jami summa.
 */

import { h } from '../core/dom.js';
import { formatMoney } from '../utils/format.js';

/** @param {{label:string, colorVar:string, amount?:number}[]} items */
export function legend(items, currency) {
  return h(
    'div',
    { class: 'legend' },
    items.map((item) =>
      h(
        'div',
        { class: 'legend__item', style: { '--legend-color': `var(${item.colorVar})` } },
        h('span', { class: 'legend__label' }, h('span', { class: 'legend__dot', 'aria-hidden': 'true' }), item.label),
        item.amount === undefined ? null : h('span', { class: 'legend__value num' }, formatMoney(item.amount, currency))
      )
    )
  );
}
