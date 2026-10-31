/**
 * components/budgetForm.js
 * Byudjet qoʻshish/tahrirlash. Kategoriya tanlagichi tanlangan davr uchun ALLAQACHON
 * byudjeti bor kategoriyalarni yashiradi (tahrirlanayotgan byudjetning oʻzi bundan mustasno).
 */

import { h } from '../core/dom.js';
import { firstError } from '../../../shared/validators.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { attachAmountFormatting } from '../utils/amountInput.js';
import { loadBudgetFormContext, saveBudget } from '../services/budgetsService.js';
import { choiceField, textField } from './form/fields.js';
import { emptyState } from './emptyState.js';
import { openModal } from './modal.js';
import { toast } from './toast.js';

export function createBudgetForm({ context, budget = null, onSaved, onCancel }) {
  const { categories, existingBudgets } = context;
  const expenseCategories = categories.filter((c) => c.kind === 'expense' || c.kind === 'both');
  const isEdit = Boolean(budget);

  function availableFor(period) {
    const taken = new Set(existingBudgets.filter((b) => b.period === period && b.id !== (budget?.id ?? null)).map((b) => b.categoryId));
    return expenseCategories.filter((c) => !taken.has(c.id));
  }

  const initialPeriod = budget?.period ?? 'monthly';
  const fields = {};

  // Kategoriya maydoni boshidanoq TOʻGʻRI roʻyxat va tanlov bilan quriladi (keyin qayta yaratilmaydi),
  // aks holda tahrirlashda oldindan tanlangan kategoriya yoʻqolib ketardi.
  fields.categoryId = choiceField({
    name: 'categoryId',
    label: t('budget.category'),
    variant: 'chips',
    value: budget?.categoryId ?? '',
    options: availableFor(initialPeriod).map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })),
  });
  const categoryHost = h('div', null, fields.categoryId.element);

  function renderCategoryHost(period) {
    const available = availableFor(period);
    if (available.length === 0) {
      categoryHost.replaceChildren(emptyState({ iconName: 'layoutGrid', title: t('budget.noCategoriesLeft') }));
    } else {
      fields.categoryId.setOptions(available.map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })));
      categoryHost.replaceChildren(fields.categoryId.element);
    }
  }
  if (availableFor(initialPeriod).length === 0) renderCategoryHost(initialPeriod);

  fields.period = choiceField({
    name: 'period',
    label: t('budget.period'),
    variant: 'segmented',
    value: initialPeriod,
    options: [
      { value: 'monthly', label: t('budget.period.monthly') },
      { value: 'weekly', label: t('budget.period.weekly') },
    ],
    onChange: renderCategoryHost,
  });

  fields.limitAmount = textField({ name: 'limitAmount', label: t('budget.limitAmount'), inputMode: 'decimal', placeholder: '0', required: true, className: 'field--amount' });
  fields.limitAmount.control.classList.add('input--amount', 'num');
  attachAmountFormatting(fields.limitAmount.control, () => 0);
  if (budget) fields.limitAmount.setValue(String(budget.limitAmount / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ','));

  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('check', { size: 18 }), t('budget.save'));
  let saving = false;

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    fields.categoryId.setError('');
    fields.limitAmount.setError('');

    try {
      const draft = { categoryId: fields.categoryId.getValue(), period: fields.period.getValue(), limitAmount: fields.limitAmount.getValue() };
      const result = await saveBudget({ id: budget?.id, draft });

      if (!result.ok) {
        for (const [key, msg] of Object.entries(result.errors)) fields[key]?.setError(msg);
        const first = firstError(result.errors);
        toast.error(first.message);
        return;
      }

      toast.success(isEdit ? t('budget.updated') : t('budget.saved'));
      onSaved?.(result.budget);
    } catch (error) {
      console.error('[finora] Byudjetni saqlash muvaffaqiyatsiz boʻldi', error);
      toast.error(error.message || t('budget.saveFailed'));
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const element = h(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    fields.period.element,
    categoryHost,
    fields.limitAmount.element,
    h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: onCancel }, t('common.cancel')), submit)
  );

  return { element, focusTarget: fields.limitAmount.control };
}

export async function openBudgetModal({ budget = null, onSaved } = {}) {
  try {
    const context = await loadBudgetFormContext();
    let modal;
    const form = createBudgetForm({
      context,
      budget,
      onSaved: (saved) => {
        modal.close();
        onSaved?.(saved);
      },
      onCancel: () => modal.close(),
    });
    modal = openModal({ title: t(budget ? 'budget.editTitle' : 'budget.addTitle'), content: form.element, initialFocus: form.focusTarget });
    return modal;
  } catch (error) {
    console.error('[finora] Byudjet formasini ochib boʻlmadi', error);
    toast.error(t('budget.saveFailed'));
    return null;
  }
}
