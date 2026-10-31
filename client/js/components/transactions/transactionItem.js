/**
 * components/transactions/transactionItem.js
 * One row of the Transactions list: the main area opens the edit form, the trash button deletes.
 * Amounts use the transaction's own currency; foreign ones also show the base-currency value.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { toBaseMinor } from '../../../../shared/money.js';
import { formatMoney, formatShortDay, formatTime } from '../../utils/format.js';

export function transactionItem({ transaction, baseCurrency, timezone, showDate, index, onEdit, onDelete }) {
  const isIncome = transaction.type === 'income';
  const title = transaction.description || transaction.category.name;
  const signed = isIncome ? transaction.amount : -transaction.amount;
  const isForeign = transaction.currency !== baseCurrency;
  const time = formatTime(transaction.occurredAt, timezone);

  return h(
    'li',
    { class: 'tx-item' },
    h(
      'button',
      { class: 'tx-item__main', type: 'button', 'data-index': String(index), onClick: () => onEdit(transaction) },
      h('span', { class: 'sr-only' }, `${t('common.edit')}: `),
      h('span', { class: 'tx-row__icon', style: { '--category-color': transaction.category.color }, 'aria-hidden': 'true' }, transaction.category.icon),
      h(
        'span',
        { class: 'tx-item__text' },
        h('span', { class: 'tx-row__title' }, title),
        h('span', { class: 'tx-item__meta' }, h('span', null, transaction.category.name), h('span', { class: 'badge' }, t(`payment.${transaction.paymentMethod}`)))
      ),
      h(
        'span',
        { class: 'tx-row__side' },
        h('span', { class: ['tx-row__amount', 'num', isIncome ? 'is-positive' : 'is-negative'] }, formatMoney(signed, transaction.currency, { sign: true })),
        isForeign ? h('span', { class: 'tx-row__sub num' }, `\u2248 ${formatMoney(toBaseMinor(transaction, baseCurrency), baseCurrency)}`) : null,
        h('span', { class: 'tx-row__sub num' }, showDate ? `${formatShortDay(transaction.dayKey)}, ${time}` : time)
      )
    ),
    h('button', { class: 'icon-btn icon-btn--ghost', type: 'button', 'aria-label': `${t('common.delete')}: ${title}`, onClick: () => onDelete(transaction) }, icon('trash', { size: 16 }))
  );
}
