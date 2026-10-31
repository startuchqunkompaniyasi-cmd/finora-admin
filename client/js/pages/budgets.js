/**
 * pages/budgets.js
 * Har bir kategoriya uchun xarajat limiti: qoʻshish, tahrirlash, oʻchirish, 80%/100% ogohlantirish.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { loadBudgetsData, deleteBudget } from '../services/budgetsService.js';
import { openBudgetModal } from '../components/budgetForm.js';
import { budgetCard } from '../components/budgets/budgetCard.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { emptyState } from '../components/emptyState.js';
import { toast } from '../components/toast.js';

export const title = t('nav.budgets');

export async function render() {
  const data = await loadBudgetsData();

  const header = h(
    'header',
    { class: 'page-header' },
    h('div', null, h('h1', { class: 'page-header__title' }, t('budget.title')), h('p', { class: 'page-header__subtitle' }, t('budget.subtitle'))),
    h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openBudgetModal() }, icon('plus', { size: 18 }), t('budget.add'))
  );

  if (data.budgets.length === 0) {
    return h(
      'div',
      null,
      header,
      h('div', { class: 'card' }, emptyState({
        iconName: 'wallet',
        title: t('budget.empty'),
        text: t('budget.emptyHint'),
        action: h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openBudgetModal() }, icon('plus', { size: 16 }), t('budget.add')),
      }))
    );
  }

  const list = h(
    'ul',
    { class: 'budget-list reset-list' },
    data.budgets.map((budget) =>
      budgetCard({
        budget,
        currency: data.baseCurrency,
        onEdit: (b) => openBudgetModal({ budget: b }),
        async onDelete(b) {
          const confirmed = await confirmDialog({
            title: t('budget.deleteTitle'),
            message: t('budget.deleteMessage', { category: b.category.name, period: t(`budget.period.${b.period}`) }),
            confirmLabel: t('common.delete'),
          });
          if (!confirmed) return;
          try {
            await deleteBudget(b.id);
            toast.success(t('budget.deleted'));
          } catch (error) {
            console.error('[finora] Byudjetni oʻchirish muvaffaqiyatsiz boʻldi', error);
            toast.error(t('budget.deleteFailed'));
          }
        },
      })
    )
  );

  return h('div', null, header, list);
}
