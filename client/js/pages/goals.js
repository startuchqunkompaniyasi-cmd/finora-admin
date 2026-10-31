/**
 * pages/goals.js
 * Moliyaviy maqsadlar: qoʻshish, tahrirlash, oʻchirish, "pul qoʻshish".
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { loadGoalsData, deleteGoal } from '../services/goalsService.js';
import { openGoalModal } from '../components/goalForm.js';
import { openContributeModal } from '../components/goals/contributeModal.js';
import { goalCard } from '../components/goals/goalCard.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { emptyState } from '../components/emptyState.js';
import { toast } from '../components/toast.js';

export const title = t('nav.goals');

export async function render() {
  const data = await loadGoalsData();

  const header = h(
    'header',
    { class: 'page-header' },
    h('div', null, h('h1', { class: 'page-header__title' }, t('goal.title')), h('p', { class: 'page-header__subtitle' }, t('goal.subtitle'))),
    h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openGoalModal() }, icon('plus', { size: 18 }), t('goal.add'))
  );

  if (data.goals.length === 0) {
    return h(
      'div',
      null,
      header,
      h('div', { class: 'card' }, emptyState({
        iconName: 'target',
        title: t('goal.empty'),
        text: t('goal.emptyHint'),
        action: h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openGoalModal() }, icon('plus', { size: 16 }), t('goal.add')),
      }))
    );
  }

  const list = h(
    'ul',
    { class: 'goal-list reset-list' },
    data.goals.map((goal) =>
      goalCard({
        goal,
        currency: data.baseCurrency,
        onEdit: (g) => openGoalModal({ goal: g }),
        onContribute: (g) => openContributeModal({ goal: g, currency: data.baseCurrency }),
        async onDelete(g) {
          const confirmed = await confirmDialog({ title: t('goal.deleteTitle'), message: t('goal.deleteMessage', { name: g.name }), confirmLabel: t('common.delete') });
          if (!confirmed) return;
          try {
            await deleteGoal(g.id);
            toast.success(t('goal.deleted'));
          } catch (error) {
            console.error('[finora] Maqsadni oʻchirish muvaffaqiyatsiz boʻldi', error);
            toast.error(t('goal.deleteFailed'));
          }
        },
      })
    )
  );

  return h('div', null, header, list);
}
