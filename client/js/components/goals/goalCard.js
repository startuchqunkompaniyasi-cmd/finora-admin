/**
 * components/goals/goalCard.js
 * Bitta maqsad: nom, muddat holati, progress, "Pul qoʻshish" tugmasi. Kartani bosish tahrirlaydi
 * (transactionItem/budgetCard bilan bir xil andoza), chelak tugmasi oʻchiradi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { formatMoney, formatPercent } from '../../utils/format.js';
import { progressBar } from '../progressBar.js';

function deadlineBadge(goal) {
  if (goal.isComplete) return h('span', { class: 'badge badge--positive' }, icon('checkCircle', { size: 12 }), t('goal.completed'));
  if (!goal.deadline) return h('span', { class: 'badge' }, t('goal.noDeadline'));
  if (goal.isOverdue) return h('span', { class: 'badge badge--negative' }, icon('alertTriangle', { size: 12 }), t('goal.overdue'));
  if (goal.daysRemaining === 0) return h('span', { class: 'badge badge--warning' }, t('goal.dueToday'));
  return h('span', { class: 'badge badge--info' }, t('goal.daysLeft', { days: goal.daysRemaining }));
}

export function goalCard({ goal, currency, onEdit, onContribute, onDelete }) {
  const tone = goal.isComplete ? 'positive' : goal.isOverdue ? 'negative' : 'default';

  return h(
    'li',
    { class: ['goal-card', 'card', goal.isComplete && 'goal-card--complete'] },
    h(
      'div',
      { class: 'goal-card__top' },
      h('button', { class: 'goal-card__title-btn', type: 'button', onClick: () => onEdit(goal) }, h('span', { class: 'goal-card__icon', 'aria-hidden': 'true' }, icon('target', { size: 20 })), h('span', { class: 'goal-card__name' }, goal.name)),
      h('button', { class: 'icon-btn icon-btn--ghost', type: 'button', 'aria-label': `${t('common.delete')}: ${goal.name}`, onClick: () => onDelete(goal) }, icon('trash', { size: 16 }))
    ),
    deadlineBadge(goal),
    h(
      'div',
      { class: 'goal-card__amounts num' },
      h('span', null, `${formatMoney(goal.currentAmount, currency)} / ${formatMoney(goal.targetAmount, currency)}`),
      h('span', null, formatPercent(goal.ratio, { digits: 0 }))
    ),
    progressBar({ value: Math.min(goal.ratio, 1), tone, label: `${goal.name}: ${formatPercent(goal.ratio, { digits: 0 })}` }),
    goal.isComplete
      ? null
      : h(
          'div',
          { class: 'goal-card__footer' },
          h('span', { class: 'goal-card__remaining num' }, `${t('goal.remaining')}: ${formatMoney(goal.remaining, currency)}`),
          h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => onContribute(goal) }, icon('plus', { size: 14 }), t('goal.contribute'))
        )
  );
}
