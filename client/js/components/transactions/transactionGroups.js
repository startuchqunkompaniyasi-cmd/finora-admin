/**
 * components/transactions/transactionGroups.js
 * Renders rows either grouped by day (date sorts) or as one flat list (amount sorts).
 */

import { h } from '../../core/dom.js';
import { toBaseMinor } from '../../../../shared/money.js';
import { formatMoney, formatRelativeDay, formatShortDay, formatWeekday } from '../../utils/format.js';
import { transactionItem } from './transactionItem.js';

function dayLabel(dayKey, today) {
  const relative = formatRelativeDay(dayKey, today);
  if (relative !== formatShortDay(dayKey)) return relative; // "Today" / "Yesterday"
  const year = dayKey.slice(0, 4) === today.slice(0, 4) ? '' : ` ${dayKey.slice(0, 4)}`;
  return `${formatWeekday(dayKey)}, ${formatShortDay(dayKey)}${year}`;
}

export function transactionGroups({ rows, grouped, baseCurrency, timezone, today, onEdit, onDelete }) {
  const item = (transaction, index, showDate) =>
    transactionItem({ transaction, baseCurrency, timezone, showDate, index, onEdit, onDelete });

  if (!grouped) {
    return h('ul', { class: 'tx-list reset-list card' }, rows.map((tx, i) => item(tx, i, true)));
  }

  const groups = [];
  rows.forEach((tx, index) => {
    const last = groups.at(-1);
    if (last?.dayKey === tx.dayKey) last.entries.push({ tx, index });
    else groups.push({ dayKey: tx.dayKey, entries: [{ tx, index }] });
  });

  return h(
    'div',
    { class: 'day-groups' },
    groups.map((group) => {
      const net = group.entries.reduce((sum, { tx }) => sum + (tx.type === 'income' ? 1 : -1) * toBaseMinor(tx, baseCurrency), 0);
      return h(
        'section',
        { class: 'day-group' },
        h('header', { class: 'day-group__header' }, h('h3', { class: 'day-group__title' }, dayLabel(group.dayKey, today)), h('span', { class: ['day-group__net', 'num', net > 0 && 'is-positive', net < 0 && 'is-negative'] }, formatMoney(net, baseCurrency, { sign: true }))),
        h('ul', { class: 'tx-list reset-list card' }, group.entries.map(({ tx, index }) => item(tx, index, false)))
      );
    })
  );
}
