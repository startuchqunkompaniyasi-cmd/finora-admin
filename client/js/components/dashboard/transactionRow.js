/**
 * components/dashboard/transactionRow.js
 * One transaction. The amount shows the transaction's own currency (a $280 payment stays $280).
 * Sign AND colour carry the meaning, so it is never colour-only.
 */

import { h } from '../../core/dom.js';
import { formatMoney, formatRelativeDay, formatTime } from '../../utils/format.js';

export function transactionRow({ transaction, timezone, today }) {
  const isIncome = transaction.type === 'income';
  const signed = isIncome ? transaction.amount : -transaction.amount;

  return h(
    'li',
    { class: 'tx-row' },
    h('span', { class: 'tx-row__icon', style: { '--category-color': transaction.category.color }, 'aria-hidden': 'true' }, transaction.category.icon),
    h('div', { class: 'tx-row__main' }, h('p', { class: 'tx-row__title' }, transaction.description || transaction.category.name), h('p', { class: 'tx-row__sub' }, transaction.category.name)),
    h(
      'div',
      { class: 'tx-row__side' },
      h('p', { class: ['tx-row__amount', 'num', isIncome ? 'is-positive' : 'is-negative'] }, formatMoney(signed, transaction.currency, { sign: true })),
      h('p', { class: 'tx-row__sub num' }, `${formatRelativeDay(transaction.dayKey, today)}, ${formatTime(transaction.occurredAt, timezone)}`)
    )
  );
}
