/**
 * components/dashboard/statCard.js
 * Income / Expenses / Savings card. `extra` lets a card add its own footer (savings rate bar).
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { counterValue } from '../counterValue.js';

let idCounter = 0;

export function statCard({ label, iconName, tone, amount, currency, valueTone, note, extra, className = '', lifecycle }) {
  const headingId = `stat-${(idCounter += 1)}`;

  return h(
    'section',
    { class: ['card', 'stat', className], 'aria-labelledby': headingId },
    h(
      'div',
      { class: 'stat__head' },
      h('span', { class: `stat__chip stat__chip--${tone}` }, icon(iconName, { size: 18 })),
      h('h2', { class: 'stat__label', id: headingId }, label)
    ),
    counterValue({ amount, currency, className: ['stat__value', valueTone === 'negative' && 'is-negative'].filter(Boolean).join(' '), lifecycle }),
    note ? h('p', { class: 'stat__note' }, note) : null,
    extra ?? null
  );
}
