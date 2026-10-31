/**
 * components/dashboard/categoryBreakdownCard.js
 * Spending by category for the current month. Shows the top rows and folds the tail
 * into a single "More categories" row so the card stays readable.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { formatMoney, formatMonthYear, formatPercent } from '../../utils/format.js';
import { emptyState } from '../emptyState.js';
import { progressBar } from '../progressBar.js';

const MAX_ROWS = 6;

function foldTail(rows) {
  if (rows.length <= MAX_ROWS) return rows;
  const head = rows.slice(0, MAX_ROWS - 1);
  const tail = rows.slice(MAX_ROWS - 1);
  return [
    ...head,
    {
      categoryId: 'more',
      total: tail.reduce((sum, row) => sum + row.total, 0),
      share: tail.reduce((sum, row) => sum + row.share, 0),
      category: { name: t('dashboard.moreCategories'), icon: '\u2026', color: '#94A3B8' },
    },
  ];
}

function categoryRow(row, currency) {
  const percent = formatPercent(row.share, { digits: 0 });
  return h(
    'li',
    { class: 'cat-row' },
    h('span', { class: 'cat-row__icon', style: { '--category-color': row.category.color }, 'aria-hidden': 'true' }, row.category.icon),
    h(
      'div',
      { class: 'cat-row__body' },
      h('div', { class: 'cat-row__top' }, h('span', { class: 'cat-row__name' }, row.category.name), h('span', { class: 'cat-row__amount num' }, formatMoney(row.total, currency))),
      h('div', { class: 'cat-row__bar' }, progressBar({ value: row.share, color: row.category.color, label: `${row.category.name}: ${percent}` }), h('span', { class: 'cat-row__percent num' }, percent))
    )
  );
}

export function categoryBreakdownCard({ spending, currency, today, onAdd, className = '' }) {
  return h(
    'section',
    { class: ['card', className], 'aria-labelledby': 'categories-title' },
    h(
      'div',
      { class: 'card__header' },
      h('div', null, h('h2', { class: 'card__title', id: 'categories-title' }, t('dashboard.spendingByCategory')), h('p', { class: 'card__subtitle' }, formatMonthYear(today))),
      h('a', { class: 'card__link', href: '#/categories' }, t('dashboard.viewAll'), icon('chevronRight', { size: 16 }))
    ),
    spending.length === 0
      ? emptyState({ iconName: 'layoutGrid', title: t('empty.noSpending'), text: t('empty.noSpendingHint') })
      : h('ul', { class: 'cat-list reset-list' }, foldTail(spending).map((row) => categoryRow(row, currency)))
  );
}
