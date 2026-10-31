/**
 * components/dashboard/recentTransactionsCard.js
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { emptyState } from '../emptyState.js';
import { transactionRow } from './transactionRow.js';

export function recentTransactionsCard({ transactions, timezone, today, onAdd, className = '' }) {
  return h(
    'section',
    { class: ['card', className], 'aria-labelledby': 'recent-title' },
    h(
      'div',
      { class: 'card__header' },
      h('h2', { class: 'card__title', id: 'recent-title' }, t('dashboard.recentTransactions')),
      h('a', { class: 'card__link', href: '#/transactions' }, t('dashboard.viewAll'), icon('chevronRight', { size: 16 }))
    ),
    transactions.length === 0
      ? emptyState({
          iconName: 'creditCard',
          title: t('empty.noTransactions'),
          text: t('empty.addFirst'),
          action: h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: onAdd }, icon('plus', { size: 16 }), t('topbar.addTransaction')),
        })
      : h('ul', { class: 'tx-list reset-list' }, transactions.map((transaction) => transactionRow({ transaction, timezone, today })))
  );
}
