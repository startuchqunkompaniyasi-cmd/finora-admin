/**
 * components/dashboard/balanceCard.js
 * The hero of the dashboard: current balance, change this month, and a 30-day trend.
 * The "approximately in the other currency" line appears only if the exchange rate loads.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { formatMoney, formatPercent } from '../../utils/format.js';
import { convertWithSnapshot } from '../../services/exchangeService.js';
import { counterValue } from '../counterValue.js';
import { sparkline } from '../sparkline.js';

export function balanceCard({ balance, change, trend, currency, ratePromise, className = '', lifecycle }) {
  const isDown = change.amount < 0;
  const changeLabel = change.ratio === null ? formatMoney(change.amount, currency, { sign: true }) : formatPercent(change.ratio, { sign: true });

  const equivalent = h('p', { class: 'balance__equivalent num', hidden: true });
  ratePromise
    .then((snapshot) => {
      const other = currency === 'UZS' ? 'USD' : 'UZS';
      equivalent.textContent = `\u2248 ${formatMoney(convertWithSnapshot(balance, currency, other, snapshot), other)}`;
      equivalent.hidden = false;
    })
    .catch(() => {
      /* The rate card reports the failure; the balance simply omits this line. */
    });

  const trendValues = trend.map((point) => point.balance);

  return h(
    'section',
    { class: ['balance', className], 'aria-labelledby': 'balance-label' },
    h(
      'div',
      null,
      h('h2', { class: 'balance__label', id: 'balance-label' }, t('dashboard.balance')),
      counterValue({ amount: balance, currency, className: 'balance__value', lifecycle }),
      h(
        'div',
        { class: 'balance__meta' },
        h('span', { class: ['balance__change', isDown && 'is-down'] }, icon(isDown ? 'trendingDown' : 'trendingUp', { size: 16 }), changeLabel, h('span', null, t('dashboard.thisMonth'))),
        equivalent
      )
    ),
    h(
      'div',
      { class: 'balance__trend' },
      h('p', { class: 'balance__trend-caption' }, t('dashboard.balanceTrend')),
      h('div', { class: ['balance__spark', isDown && 'is-down'] }, sparkline({ values: trendValues, ariaLabel: `${t('dashboard.balance')}, ${t('dashboard.balanceTrend').toLowerCase()}` }))
    )
  );
}
