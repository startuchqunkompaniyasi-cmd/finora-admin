/**
 * components/budgets/budgetCard.js
 * Bitta byudjet: kategoriya, davr, limit, sarflangan/qolgan va progress bar. Kartani bosish
 * tahrirlaydi (transactionItem uslubi bilan bir xil andoza), chelak tugmasi oʻchiradi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { formatMoney, formatPercent } from '../../utils/format.js';
import { progressBar } from '../progressBar.js';

const TONE = { ok: 'positive', warning: 'warning', over: 'negative' };

export function budgetCard({ budget, currency, onEdit, onDelete }) {
  const remainingTone = budget.remaining < 0 ? 'is-negative' : 'is-positive';

  return h(
    'li',
    { class: ['budget-card', 'card', `budget-card--${budget.status}`] },
    h(
      'button',
      { class: 'budget-card__main', type: 'button', onClick: () => onEdit(budget) },
      h('span', { class: 'sr-only' }, `${t('common.edit')}: `),
      h('span', { class: 'tx-row__icon', style: { '--category-color': budget.category.color }, 'aria-hidden': 'true' }, budget.category.icon),
      h(
        'span',
        { class: 'budget-card__body' },
        h(
          'span',
          { class: 'budget-card__top' },
          h('span', { class: 'budget-card__name' }, budget.category.name),
          h('span', { class: 'badge' }, t(`budget.period.${budget.period}`))
        ),
        h(
          'span',
          { class: 'budget-card__amounts num' },
          h('span', null, `${formatMoney(budget.spent, currency)} / ${formatMoney(budget.limitAmount, currency)}`),
          h('span', { class: budget.status === 'over' ? 'is-negative' : undefined }, formatPercent(budget.ratio, { digits: 0 }))
        ),
        progressBar({ value: Math.min(budget.ratio, 1), tone: TONE[budget.status], label: `${budget.category.name}: ${formatPercent(budget.ratio, { digits: 0 })}` }),
        h(
          'span',
          { class: ['budget-card__remaining', 'num', remainingTone] },
          budget.remaining >= 0 ? `${t('budget.remaining')}: ${formatMoney(budget.remaining, currency)}` : t('budget.overBy', { amount: formatMoney(-budget.remaining, currency) })
        )
      )
    ),
    h('button', { class: 'icon-btn icon-btn--ghost', type: 'button', 'aria-label': `${t('common.delete')}: ${budget.category.name}`, onClick: () => onDelete(budget) }, icon('trash', { size: 16 }))
  );
}
