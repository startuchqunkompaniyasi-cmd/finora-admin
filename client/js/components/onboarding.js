/**
 * components/onboarding.js
 * First-run wizard (non-dismissible modal):
 *   1 Welcome -> 2 Currency + starting balance -> 3 First transaction -> 4 Done
 * "Explore with sample data" skips the setup and loads demo transactions instead.
 */

import { h } from '../core/dom.js';
import { CURRENCIES } from '../../../shared/constants.js';
import { toMinor } from '../../../shared/money.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { attachAmountFormatting } from '../utils/amountInput.js';
import { profileRepo } from '../data/profileRepo.js';
import { getSession } from '../services/authService.js';
import { clearDemoData, seedDemoData } from '../data/seed.js';
import { loadFormContext } from '../services/transactionsService.js';
import { brandMark } from './brandLogo.js';
import { choiceField, textField } from './form/fields.js';
import { createTransactionForm } from './transactionForm.js';
import { openModal } from './modal.js';
import { toast } from './toast.js';

const TOTAL_STEPS = 4;

function stepDots(step) {
  return h(
    'ol',
    { class: 'steps', 'aria-label': t('onboarding.step', { step, total: TOTAL_STEPS }) },
    Array.from({ length: TOTAL_STEPS }, (_, i) => h('li', { class: ['steps__dot', i + 1 <= step && 'is-done'], 'aria-current': i + 1 === step ? 'step' : undefined }))
  );
}

export function startOnboarding() {
  let modal;
  const state = { addedFirst: false, currency: null };

  const finish = () => {
    modal.close();
    location.hash = '#/dashboard';
  };

  function show(step, view, titleText) {
    modal.setTitle(titleText);
    modal.setContent(stepDots(step), view.element);
    view.focusTarget?.focus();
  }

  // ---------- 1. welcome ----------
  function welcomeView() {
    const start = h('button', { class: 'btn btn--primary', type: 'button' }, t('onboarding.start'));
    const explore = h('button', { class: 'btn btn--secondary', type: 'button' }, t('onboarding.explore'));

    start.addEventListener('click', async () => {
      start.disabled = explore.disabled = true;
      try {
        if ((await profileRepo.get()).hasDemoData) await clearDemoData(); // leftover sample data from an earlier visit
        show(2, currencyView(), t('onboarding.currencyTitle'));
      } catch (error) {
        console.error('[finora] Onboarding failed', error);
        toast.error(error.message);
        start.disabled = explore.disabled = false;
      }
    });

    explore.addEventListener('click', async () => {
      start.disabled = explore.disabled = true;
      try {
        await seedDemoData();
        await profileRepo.update({ onboardedAt: new Date().toISOString() });
        modal.close();
        toast.info(t('onboarding.sampleLoaded'));
      } catch (error) {
        console.error('[finora] Loading sample data failed', error);
        toast.error(error.message);
        start.disabled = explore.disabled = false;
      }
    });

    return {
      focusTarget: start,
      element: h(
        'div',
        { class: 'onboarding' },
        brandMark(56),
        h('div', { class: 'onboarding__lead' }, h('p', null, t('onboarding.line1')), h('p', null, t('onboarding.line2')), h('p', null, t('onboarding.line3'))),
        // Namunaviy maʼlumot faqat mehmon (hisobga kirmagan) uchun: uni haqiqiy hisobga yozish
        // mantiqsiz va api rejimida `replaceAll()` qoʻllab-quvvatlanmaydi.
        h('div', { class: 'modal__actions modal__actions--stack' }, start, getSession() ? null : explore)
      ),
    };
  }

  // ---------- 2. currency + starting balance ----------
  function currencyView() {
    const currency = choiceField({
      name: 'base-currency',
      label: t('tx.currency'),
      variant: 'segmented',
      hideLegend: true,
      value: 'UZS',
      options: Object.values(CURRENCIES).map((c) => ({ value: c.code, label: `${c.code}  ${c.name}` })),
    });
    const balance = textField({ name: 'opening-balance', label: t('onboarding.balance'), inputMode: 'decimal', placeholder: '0', optional: true, hint: t('onboarding.balanceHint') });
    balance.control.classList.add('input--amount', 'num');
    attachAmountFormatting(balance.control, () => CURRENCIES[currency.getValue()].decimals);

    const next = h('button', { class: 'btn btn--primary', type: 'submit' }, t('onboarding.continue'), icon('arrowRight', { size: 18 }));
    const form = h(
      'form',
      { class: 'form', novalidate: true },
      h('p', { class: 'modal__description' }, t('onboarding.currencyText')),
      currency.element,
      balance.element,
      h('div', { class: 'modal__actions' }, next)
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const raw = balance.getValue().trim();
      const openingBalance = raw === '' ? 0 : toMinor(raw);
      if (Number.isNaN(openingBalance)) {
        balance.setError(t('validation.amount'));
        balance.focus();
        return;
      }
      next.disabled = true;
      try {
        state.currency = currency.getValue();
        await profileRepo.update({ baseCurrency: state.currency, openingBalance, onboardedAt: new Date().toISOString() });
        show(3, await firstTransactionView(), t('onboarding.firstTitle'));
      } catch (error) {
        console.error('[finora] Saving onboarding settings failed', error);
        toast.error(error.message);
        next.disabled = false;
      }
    });

    return { element: form, focusTarget: currency.element.querySelector('input') };
  }

  // ---------- 3. first transaction ----------
  async function firstTransactionView() {
    const context = await loadFormContext();
    const form = createTransactionForm({
      context,
      cancelLabel: t('onboarding.skip'),
      onCancel: () => show(4, doneView(), t('onboarding.doneTitle')),
      onSaved: () => {
        state.addedFirst = true;
        show(4, doneView(), t('onboarding.doneTitle'));
      },
    });
    return { element: form.element, focusTarget: form.focusTarget };
  }

  // ---------- 4. done ----------
  function doneView() {
    const item = (done, text) => h('li', { class: ['checklist__item', done && 'is-done'] }, icon(done ? 'checkCircle' : 'clock', { size: 20 }), h('span', null, text));
    const go = h('button', { class: 'btn btn--primary', type: 'button', onClick: finish }, t('onboarding.finish'));

    return {
      focusTarget: go,
      element: h(
        'div',
        { class: 'onboarding' },
        h(
          'ul',
          { class: 'checklist reset-list' },
          item(true, t('onboarding.doneCurrency', { currency: state.currency })),
          item(state.addedFirst, state.addedFirst ? t('onboarding.doneFirst') : t('onboarding.doneFirstLater')),
          item(false, t('onboarding.doneBudget'))
        ),
        h('div', { class: 'modal__actions' }, go)
      ),
    };
  }

  const first = welcomeView();
  modal = openModal({ title: t('onboarding.welcomeTitle'), size: 'lg', dismissible: false, content: [stepDots(1), first.element], initialFocus: first.focusTarget });
  return modal;
}
