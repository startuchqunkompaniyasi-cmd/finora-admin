/**
 * components/statistics/yearlyView.js
 * Bir yillik yigʻma: jami daromad/xarajat/jamgʻarma, jamgʻarma darajasi, 12 oylik grafik (sof natija chizigʻi bilan) va jadval.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { monthSeries, yearStatistics } from '../../../../shared/stats.js';
import { formatMoney, formatPercent, monthNameCapitalized } from '../../utils/format.js';
import { monthChartData } from '../../utils/chartData.js';
import { selectField } from '../form/fields.js';
import { incomeExpenseChart } from '../incomeExpenseChart.js';
import { legend } from '../legend.js';
import { progressBar } from '../progressBar.js';
import { metricCard, metricGrid, toneOf } from './metricCard.js';
import { periodNav } from './periodNav.js';

function monthsTable(months, currency, totals) {
  const money = (amount) => h('td', { class: 'is-num num' }, formatMoney(amount, currency));
  const net = (amount) => h('td', { class: ['is-num', 'num', amount > 0 && 'is-positive', amount < 0 && 'is-negative'] }, formatMoney(amount, currency, { sign: true }));

  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('caption', { class: 'sr-only' }, t('stats.monthlyTable')),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('stats.month')), h('th', { scope: 'col', class: 'is-num' }, t('chart.income')), h('th', { scope: 'col', class: 'is-num' }, t('chart.expense')), h('th', { scope: 'col', class: 'is-num' }, t('stats.net')))),
      h(
        'tbody',
        null,
        months.map((m) => h('tr', { class: m.count === 0 ? 'is-future' : undefined }, h('th', { scope: 'row' }, monthNameCapitalized(m.month)), money(m.income), money(m.expense), net(m.net)))
      ),
      h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, t('stats.yearly')), money(totals.income), money(totals.expense), net(totals.net)))
    )
  );
}

export function yearlyView({ ctx, data }) {
  const { baseCurrency: currency, today, transactions, years } = data;
  const currentYear = Number(today.slice(0, 4));
  const requested = Number(ctx.query.get('year'));
  let year = years.includes(requested) ? requested : currentYear;

  const yearSelect = selectField({ name: 'year', label: t('stats.year'), hideLabel: true, value: String(year), options: years.map((y) => ({ value: String(y), label: String(y) })), onChange: (v) => select(Number(v)) });
  const nav = periodNav({
    center: h('div', { class: 'period-nav__selects' }, yearSelect.element),
    prevLabel: t('stats.year') + ' \u2039',
    nextLabel: t('stats.year') + ' \u203A',
    onPrev: () => select(year - 1),
    onNext: () => select(year + 1),
    today: { label: String(currentYear), onClick: () => select(currentYear) },
  });

  const legendHost = h('div');
  const summaryHost = h('div');
  const tableHost = h('div');

  const initial = monthSeries(transactions, year, currency);
  const chart = incomeExpenseChart({ lifecycle: ctx, currency, ariaLabel: t('stats.yearChartTitle'), initial: monthChartData(initial, year), showNet: true });

  function draw() {
    const months = monthSeries(transactions, year, currency);
    const stats = yearStatistics(months);

    yearSelect.setValue(String(year));
    nav.update({ prevDisabled: year <= years.at(-1), nextDisabled: year >= currentYear, showToday: year !== currentYear });
    chart.update(monthChartData(months, year));
    legendHost.replaceChildren(legend([{ label: t('chart.income'), colorVar: '--positive', amount: stats.income }, { label: t('chart.expense'), colorVar: '--negative', amount: stats.expense }], currency));

    const rate = stats.savingsRate;
    const best = stats.bestMonth;
    const top = stats.topSpendingMonth;

    summaryHost.replaceChildren(
      h(
        'div',
        { class: 'stats-summary' },
        metricGrid([
          metricCard({ label: t('stats.totalIncome'), value: formatMoney(stats.income, currency), tone: 'positive' }),
          metricCard({ label: t('stats.totalExpense'), value: formatMoney(stats.expense, currency), tone: 'negative' }),
          metricCard({ label: t('stats.savings'), value: formatMoney(stats.net, currency, { sign: true }), tone: toneOf(stats.net) }),
          h(
            'div',
            { class: 'metric card' },
            h('p', { class: 'metric__label' }, t('stats.savingsRate')),
            h('p', { class: ['metric__value', 'num', rate !== null && rate > 0 && 'is-positive', rate !== null && rate < 0 && 'is-negative'] }, rate === null ? '\u2014' : formatPercent(rate)),
            rate === null ? h('p', { class: 'metric__hint' }, t('stats.noIncomeHint')) : progressBar({ value: rate, tone: rate < 0 ? 'negative' : 'positive', label: t('stats.savingsRate') })
          ),
          metricCard({ label: t('stats.bestMonth'), value: best ? monthNameCapitalized(best.month) : '\u2014', hint: best ? formatMoney(best.net, currency, { sign: true }) : t('stats.noneRecorded') }),
          metricCard({ label: t('stats.topSpendingMonth'), value: top ? monthNameCapitalized(top.month) : '\u2014', hint: top ? formatMoney(top.expense, currency) : t('stats.noneRecorded') }),
        ])
      )
    );
    tableHost.replaceChildren(monthsTable(months, currency, stats));
  }

  function select(nextYear) {
    year = Math.min(Math.max(nextYear, years.at(-1)), currentYear);
    ctx.setQuery({ tab: 'yearly', year: year === currentYear ? '' : year });
    draw();
  }

  draw();

  return h(
    'div',
    { class: 'stats-view' },
    nav.element,
    summaryHost,
    h('section', { class: 'card', 'aria-labelledby': 'year-chart-title' }, h('div', { class: 'card__header weekly__header' }, h('h2', { class: 'card__title', id: 'year-chart-title' }, t('stats.yearChartTitle')), legendHost), chart.element),
    h('section', { class: 'card', 'aria-labelledby': 'months-table-title' }, h('h2', { class: 'card__title', id: 'months-table-title' }, t('stats.monthlyTable')), tableHost)
  );
}
