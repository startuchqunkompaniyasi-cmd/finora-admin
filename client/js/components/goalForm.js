/**
 * components/goalForm.js
 * Maqsad qoʻshish/tahrirlash: nom, kerakli summa, hozir yigʻilgan (ixtiyoriy), muddat (ixtiyoriy).
 */

import { h } from '../core/dom.js';
import { LIMITS } from '../../../shared/constants.js';
import { firstError } from '../../../shared/validators.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { attachAmountFormatting } from '../utils/amountInput.js';
import { saveGoal } from '../services/goalsService.js';
import { textField } from './form/fields.js';
import { openModal } from './modal.js';
import { toast } from './toast.js';

const toAmountText = (minor) => String(minor / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function createGoalForm({ context, goal = null, onSaved, onCancel }) {
  const isEdit = Boolean(goal);
  const fields = {};

  fields.name = textField({ name: 'name', label: t('goal.name'), value: goal?.name ?? '', placeholder: t('goal.namePlaceholder'), maxLength: LIMITS.goalNameMax, required: true });
  fields.targetAmount = textField({ name: 'targetAmount', label: t('goal.targetAmount'), value: goal ? toAmountText(goal.targetAmount) : '', inputMode: 'decimal', placeholder: '0', required: true, className: 'field--amount' });
  fields.targetAmount.control.classList.add('input--amount', 'num');
  attachAmountFormatting(fields.targetAmount.control, () => 0);

  fields.currentAmount = textField({ name: 'currentAmount', label: t('goal.currentAmount'), value: goal ? toAmountText(goal.currentAmount) : '', inputMode: 'decimal', placeholder: '0', optional: true, className: 'field--amount' });
  fields.currentAmount.control.classList.add('input--amount', 'num');
  attachAmountFormatting(fields.currentAmount.control, () => 0);

  fields.deadline = textField({ name: 'deadline', label: t('goal.deadline'), type: 'date', value: goal?.deadline ?? '', optional: true, attrs: { min: LIMITS.minDate } });

  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('check', { size: 18 }), t('goal.save'));
  let saving = false;

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    Object.values(fields).forEach((field) => field.setError(''));

    try {
      const draft = {
        name: fields.name.getValue(),
        targetAmount: fields.targetAmount.getValue(),
        currentAmount: fields.currentAmount.getValue(),
        deadline: fields.deadline.getValue(),
      };
      const result = await saveGoal({ id: goal?.id, draft });

      if (!result.ok) {
        for (const [key, msg] of Object.entries(result.errors)) fields[key]?.setError(msg);
        const first = firstError(result.errors);
        toast.error(first.message);
        fields[first.field]?.focus();
        return;
      }

      toast.success(isEdit ? t('goal.updated') : t('goal.saved'));
      onSaved?.(result.goal);
    } catch (error) {
      console.error('[finora] Maqsadni saqlash muvaffaqiyatsiz boʻldi', error);
      toast.error(error.message || t('goal.saveFailed'));
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const element = h(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    fields.name.element,
    fields.targetAmount.element,
    fields.currentAmount.element,
    fields.deadline.element,
    h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: onCancel }, t('common.cancel')), submit)
  );

  return { element, focusTarget: fields.name.control };
}

export async function openGoalModal({ goal = null, onSaved } = {}) {
  let modal;
  const form = createGoalForm({
    context: {},
    goal,
    onSaved: (saved) => {
      modal.close();
      onSaved?.(saved);
    },
    onCancel: () => modal.close(),
  });
  modal = openModal({ title: t(goal ? 'goal.editTitle' : 'goal.addTitle'), content: form.element, initialFocus: form.focusTarget });
  return modal;
}
