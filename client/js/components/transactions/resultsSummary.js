/**
 * components/transactions/resultsSummary.js
 * Totals for whatever the filters currently show.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { formatMoney } from '../../utils/format.js';

function figure(label, value, tone) {
  return h('div', { class: 'summary__item' }, h('dt', { class: 'summary__label' }, label), h('dd', { class: ['summary__value', 'num', tone] }, value));
}

export function resultsSummary({ summary, currency }) {
  return h(
    'dl',
    { class: 'summary card', 'aria-label': t('tx.resultsSummary') },
    figure(t('tx.count'), String(summary.count)),
    figure(t('dashboard.income'), formatMoney(summary.income, currency), 'is-positive'),
    figure(t('dashboard.expenses'), formatMoney(summary.expense, currency), 'is-negative'),
    figure(t('tx.net'), formatMoney(summary.net, currency, { sign: true }), summary.net < 0 ? 'is-negative' : summary.net > 0 ? 'is-positive' : '')
  );
}
