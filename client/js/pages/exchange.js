/**
 * pages/exchange.js
 * Joriy USD/UZS kursi, tarixiy grafik (1K/7K/1O/3O/6O/1Y) va valyuta konverteri.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { getUsdUzsSnapshot, getRateHistory } from '../services/exchangeService.js';
import { rateHero } from '../components/exchange/rateHero.js';
import { rangeTabs } from '../components/exchange/rangeTabs.js';
import { rateHistoryChart } from '../components/exchange/rateHistoryChart.js';
import { converterCard } from '../components/exchange/converterCard.js';
import { srTable } from '../components/srTable.js';
import { formatMoney, formatShortDay } from '../utils/format.js';

export const title = t('nav.exchange');

const DEFAULT_RANGE = '1M';

export async function render(ctx) {
  const initialRange = ctx.query.get('range');
  let range = ['1D', '7D', '1M', '3M', '6M', '1Y'].includes(initialRange) ? initialRange : DEFAULT_RANGE;

  const chart = rateHistoryChart({ lifecycle: ctx });
  const tableHost = h('div');
  let requestId = 0;

  async function loadHistory() {
    const id = ++requestId;
    chart.showLoading();
    try {
      const { points } = await getRateHistory(range);
      if (id !== requestId) return;
      chart.render(points);
      tableHost.replaceChildren(
        srTable({
          caption: t('exchange.historyTitle'),
          headers: [t('common.today'), 'USD/UZS'],
          rows: points.map((point) => [formatShortDay(point.date), formatMoney(Math.round(point.rate * 100), 'UZS')]),
        })
      );
    } catch (error) {
      if (id !== requestId) return;
      console.error('[finora] Kurs tarixini yuklab boʻlmadi', error);
      chart.showError(loadHistory);
    }
  }

  const tabs = rangeTabs({
    value: range,
    onChange: (next) => {
      range = next;
      tabs.setValue(range);
      ctx.setQuery({ range: range === DEFAULT_RANGE ? '' : range });
      loadHistory();
    },
  });

  ctx.onMounted(loadHistory);

  return h(
    'div',
    null,
    h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('exchange.title')), h('p', { class: 'page-header__subtitle' }, t('exchange.subtitle')))),
    h(
      'div',
      { class: 'exchange-grid' },
      rateHero({ snapshotPromise: getUsdUzsSnapshot(), className: 'exchange-grid__hero' }),
      converterCard({ className: 'exchange-grid__converter' }),
      h(
        'section',
        { class: 'card exchange-grid__history', 'aria-labelledby': 'history-title' },
        h('div', { class: 'card__header exchange-history__header' }, h('h2', { class: 'card__title', id: 'history-title' }, t('exchange.historyTitle')), tabs.element),
        chart.element,
        tableHost
      )
    )
  );
}
