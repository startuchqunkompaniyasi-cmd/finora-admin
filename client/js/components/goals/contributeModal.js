/**
 * components/goals/contributeModal.js
 * "Pul qoʻshish" tez oynasi: bitta summa maydoni, toʻliq tahrirlash formasidan qulayroq.
 * Maqsad shu hissa bilan yakunlansa, alohida tabriq toasti chiqadi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { formatMoney } from '../../utils/format.js';
import { attachAmountFormatting } from '../../utils/amountInput.js';
import { contributeToGoal } from '../../services/goalsService.js';
import { textField } from '../form/fields.js';
import { openModal } from '../modal.js';
import { toast } from '../toast.js';

export function openContributeModal({ goal, currency, onSaved }) {
  const amount = textField({ name: 'contribute-amount', label: t('goal.contributeAmount'), inputMode: 'decimal', placeholder: '0', required: true, className: 'field--amount' });
  amount.control.classList.add('input--amount', 'num');
  attachAmountFormatting(amount.control, () => 0);

  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('plus', { size: 18 }), t('goal.contributeSave'));
  let saving = false;
  let modal;

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    amount.setError('');

    try {
      const result = await contributeToGoal(goal.id, amount.getValue());
      if (!result.ok) {
        amount.setError(result.error);
        toast.error(result.error);
        return;
      }

      modal.close();
      toast.success(t('goal.contributed', { amount: formatMoney(result.goal.currentAmount - goal.currentAmount, currency) }));
      if (result.justCompleted) toast.success(t('goal.completedToast', { name: goal.name }));
      onSaved?.(result.goal);
    } catch (error) {
      console.error('[finora] Pul qoʻshish muvaffaqiyatsiz boʻldi', error);
      toast.error(error.message);
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const element = h(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    h('p', { class: 'modal__description' }, `${t('goal.remaining')}: ${formatMoney(goal.remaining, currency)}`),
    amount.element,
    h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, t('common.cancel')), submit)
  );

  modal = openModal({ title: t('goal.contributeTitle', { name: goal.name }), size: 'sm', content: element, initialFocus: amount.control });
  return modal;
}
