/**
 * components/transactionForm.js
 * Add / edit transaction. Validation is shared/validators.js (the same rules the server will
 * enforce); this file only wires fields, shows errors and focuses the first invalid one.
 */

import { h } from '../core/dom.js';
import { CURRENCIES, LIMITS, PAYMENT_METHODS } from '../../../shared/constants.js';
import { firstError } from '../../../shared/validators.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { attachAmountFormatting, formatAmountText } from '../utils/amountInput.js';
import { draftFromTransaction, emptyDraft, loadFormContext, saveTransaction } from '../services/transactionsService.js';
import { choiceField, textField } from './form/fields.js';
import { openModal } from './modal.js';
import { toast } from './toast.js';

/**
 * @param {Object} o
 * @param {Awaited<ReturnType<typeof loadFormContext>>} o.context
 * @param {object|null} [o.transaction]   pass an existing transaction to edit it
 * @param {(transaction:object)=>void} o.onSaved
 * @param {()=>void} [o.onCancel]
 */
export function createTransactionForm({ context, transaction = null, onSaved, onCancel, submitLabel, cancelLabel = t('common.cancel') }) {
  const { profile, categories } = context;
  const isEdit = Boolean(transaction);
  const draft = isEdit ? draftFromTransaction(transaction, profile.timezone) : emptyDraft(context);
  const decimalsFor = (currency) => CURRENCIES[currency]?.decimals ?? 2;

  const categoryOptions = (type) =>
    categories.filter((c) => c.kind === 'both' || c.kind === type).map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color }));

  const fields = {};

  fields.type = choiceField({
    name: 'type',
    label: t('tx.type'),
    variant: 'segmented',
    value: draft.type,
    hideLegend: true,
    options: [
      { value: 'expense', label: t('tx.expense'), color: 'var(--negative)' },
      { value: 'income', label: t('tx.income'), color: 'var(--positive)' },
    ],
    onChange: (type) => fields.categoryId.setOptions(categoryOptions(type)),
  });

  fields.amount = textField({
    name: 'amount',
    label: t('tx.amount'),
    inputMode: 'decimal',
    placeholder: '0',
    required: true,
    className: 'field--amount',
    value: formatAmountText(draft.amount, decimalsFor(draft.currency)),
  });
  fields.amount.control.classList.add('input--amount', 'num');
  attachAmountFormatting(fields.amount.control, () => decimalsFor(fields.currency.getValue()));

  const fxHint = h('p', { class: 'field__hint' });
  const refreshFxHint = () => {
    const currency = fields.currency.getValue();
    fxHint.textContent = currency !== profile.baseCurrency ? t('tx.fxHint', { base: profile.baseCurrency }) : '';
    fxHint.hidden = !fxHint.textContent;
  };

  fields.currency = choiceField({
    name: 'currency',
    label: t('tx.currency'),
    variant: 'segmented',
    value: draft.currency,
    options: Object.values(CURRENCIES).map((c) => ({ value: c.code, label: c.code })),
    onChange: (currency) => {
      fields.amount.setValue(formatAmountText(fields.amount.getValue(), decimalsFor(currency)));
      refreshFxHint();
    },
  });
  refreshFxHint();

  fields.categoryId = choiceField({ name: 'categoryId', label: t('tx.category'), variant: 'chips', value: draft.categoryId, options: categoryOptions(draft.type) });
  fields.description = textField({ name: 'description', label: t('tx.description'), value: draft.description, maxLength: LIMITS.descriptionMax, optional: true, placeholder: t('tx.descriptionPlaceholder') });
  fields.paymentMethod = choiceField({
    name: 'paymentMethod',
    label: t('tx.paymentMethod'),
    variant: 'chips',
    value: draft.paymentMethod,
    options: PAYMENT_METHODS.map((method) => ({ value: method, label: t(`payment.${method}`) })),
  });
  fields.date = textField({ name: 'date', label: t('tx.date'), type: 'date', value: draft.date, required: true, attrs: { max: context.today, min: LIMITS.minDate } });
  fields.time = textField({ name: 'time', label: t('tx.time'), type: 'time', value: draft.time, required: true });
  fields.note = textField({ name: 'note', label: t('tx.note'), value: draft.note, multiline: true, maxLength: LIMITS.noteMax, optional: true });

  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('check', { size: 18 }), submitLabel ?? t('tx.save'));
  let saving = false;

  const readDraft = () => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.getValue()]));

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    Object.values(fields).forEach((field) => field.setError(''));

    try {
      const result = await saveTransaction({ id: transaction?.id, draft: readDraft() });

      if (!result.ok) {
        for (const [key, message] of Object.entries(result.errors)) fields[key]?.setError(message);
        const first = firstError(result.errors);
        toast.error(first.message);
        fields[first.field]?.focus();
        return;
      }

      toast.success(isEdit ? t('tx.updated') : t('tx.added'));
      for (const crossing of result.budgetCrossings ?? []) {
        const key = crossing.level === 'over' ? 'budget.toastOver' : 'budget.toastWarning';
        toast.warning(t(key, { category: crossing.budget.category.name, period: t(`budget.period.${crossing.budget.period}`) }));
      }
      onSaved?.(result.transaction);
    } catch (error) {
      console.error('[finora] Saving a transaction failed', error);
      toast.error(error.message || t('tx.saveFailed'));
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const element = h(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    fields.type.element,
    h('div', { class: 'form__row form__row--amount' }, fields.amount.element, fields.currency.element),
    fxHint,
    fields.categoryId.element,
    fields.description.element,
    fields.paymentMethod.element,
    h('div', { class: 'form__row' }, fields.date.element, fields.time.element),
    fields.note.element,
    h('div', { class: 'modal__actions' }, onCancel ? h('button', { class: 'btn btn--secondary', type: 'button', onClick: onCancel }, cancelLabel) : null, submit)
  );

  return { element, focusTarget: fields.amount.control };
}

/**
 * Open the add/edit form in a modal. Saving emits `data:changed`, so the open page refreshes itself.
 * @returns {Promise<{close:Function}|null>}
 */
export async function openTransactionModal({ transaction = null, onSaved } = {}) {
  try {
    const context = await loadFormContext();
    let modal;
    const form = createTransactionForm({
      context,
      transaction,
      onSaved: (saved) => {
        modal.close();
        onSaved?.(saved);
      },
      onCancel: () => modal.close(),
    });
    modal = openModal({ title: t(transaction ? 'tx.editTitle' : 'tx.addTitle'), size: 'lg', content: form.element, initialFocus: form.focusTarget });
    return modal;
  } catch (error) {
    console.error('[finora] Could not open the transaction form', error);
    toast.error(t('tx.saveFailed'));
    return null;
  }
}
