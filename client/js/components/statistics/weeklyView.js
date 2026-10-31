/**
 * components/statistics/weeklyView.js
 * Dushanbadan yakshanbagacha: grafik, 6 ta koʻrsatkich va kunlar jadvali. Haftalar oʻrtasida yurish mumkin.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { addDays, isValidDayKey, startOfWeek, weekdayIndex } from '../../../../shared/dates.js';
import { weekStatistics, weeklySeries } from '../../../../shared/stats.js';
import { formatDayRange, formatMoney, formatShortDay, weekdayName } from '../../utils/format.js';
import { weekChartData } from '../../utils/chartData.js';
import { incomeExpenseChart } from '../incomeExpenseChart.js';
import { legend } from '../legend.js';
import { metricCard, metricGrid, toneOf } from './metricCard.js';
import { periodNav } from './periodNav.js';

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const dayTitle = (dayKey) => `${capitalize(weekdayName(weekdayIndex(dayKey)))}, ${formatShortDay(dayKey)}`;

function dayTable(series, today, currency) {
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('caption', { class: 'sr-only' }, t('stats.dailyBreakdown')),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('stats.day')), h('th', { scope: 'col', class: 'is-num' }, t('chart.income')), h('th', { scope: 'col', class: 'is-num' }, t('chart.expense')), h('th', { scope: 'col', class: 'is-num' }, t('stats.net')))),
      h(
        'tbody',
        null,
        series.map((day) => {
          const net = day.income - day.expense;
          return h(
            'tr',
            { class: day.dayKey > today ? 'is-future' : undefined },
            h('th', { scope: 'row' }, dayTitle(day.dayKey)),
            h('td', { class: 'is-num num' }, formatMoney(day.income, currency)),
            h('td', { class: 'is-num num' }, formatMoney(day.expense, currency)),
            h('td', { class: ['is-num', 'num', net > 0 && 'is-positive', net < 0 && 'is-negative'] }, formatMoney(net, currency, { sign: true }))
          );
        })
      )
    )
  );
}

export function weeklyView({ ctx, data }) {
  const { baseCurrency: currency, today, transactions } = data;
  const thisWeek = startOfWeek(today);
  const earliestWeek = startOfWeek(data.earliestDayKey ?? today);

  const requested = ctx.query.get('date');
  let anchor = isValidDayKey(requested) && requested <= today ? requested : today;

  const rangeLabel = h('span', { class: 'period-nav__label num', 'aria-live': 'polite' });
  const nav = periodNav({
    center: rangeLabel,
    prevLabel: t('stats.prevWeek'),
    nextLabel: t('stats.nextWeek'),
    onPrev: () => go(addDays(startOfWeek(anchor), -7)),
    onNext: () => go(addDays(startOfWeek(anchor), 7)),
    today: { label: t('stats.thisWeek'), onClick: () => go(today) },
  });

  const legendHost = h('div');
  const metricsHost = h('div');
  const tableHost = h('div');

  const initialSeries = weeklySeries(transactions, anchor, currency);
  const chart = incomeExpenseChart({ lifecycle: ctx, currency, ariaLabel: `${t('stats.weekly')}: ${t('chart.income')}, ${t('chart.expense')}`, initial: weekChartData(initialSeries) });

  function draw() {
    const series = weeklySeries(transactions, anchor, currency);
    const stats = weekStatistics(series, today);
    const start = startOfWeek(anchor);

    rangeLabel.textContent = formatDayRange(start, addDays(start, 6)) + (start.slice(0, 4) === today.slice(0, 4) ? '' : ` ${start.slice(0, 4)}`);
    nav.update({ prevDisabled: start <= earliestWeek, nextDisabled: start >= thisWeek, showToday: start !== thisWeek });
    chart.update(weekChartData(series));
    legendHost.replaceChildren(legend([{ label: t('chart.income'), colorVar: '--positive', amount: stats.income }, { label: t('chart.expense'), colorVar: '--negative', amount: stats.expense }], currency));

    const extreme = (entry) =>
      entry ? { value: capitalize(weekdayName(weekdayIndex(entry.dayKey))), hint: entry.amount > 0 ? formatMoney(entry.amount, currency) : t('stats.noSpending') } : { value: '\u2014', hint: t('stats.noSpending') };
    const highest = extreme(stats.highest);
    const lowest = extreme(stats.lowest);

    metricsHost.replaceChildren(
      metricGrid([
        metricCard({ label: t('stats.weekIncome'), value: formatMoney(stats.income, currency), tone: 'positive' }),
        metricCard({ label: t('stats.weekExpense'), value: formatMoney(stats.expense, currency), tone: 'negative' }),
        metricCard({ label: t('stats.weekSavings'), value: formatMoney(stats.net, currency, { sign: true }), tone: toneOf(stats.net) }),
        metricCard({ label: t('stats.avgDailySpending'), value: formatMoney(stats.avgDailySpending, currency), hint: stats.daysCounted ? t('stats.overDays', { days: stats.daysCounted }) : undefined }),
        metricCard({ label: t('stats.highestDay'), value: highest.value, hint: highest.hint }),
        metricCard({ label: t('stats.lowestDay'), value: lowest.value, hint: lowest.hint }),
      ])
    );
    tableHost.replaceChildren(dayTable(series, today, currency));
  }

  function go(dayKey) {
    anchor = dayKey > today ? today : dayKey;
    ctx.setQuery({ tab: 'weekly', date: startOfWeek(anchor) === thisWeek ? '' : startOfWeek(anchor) });
    draw();
  }

  draw();

  return h(
    'div',
    { class: 'stats-view' },
    nav.element,
    h('section', { class: 'card', 'aria-label': t('stats.weekly') }, h('div', { class: 'card__header weekly__header' }, h('h2', { class: 'card__title' }, t('dashboard.weeklyOverview')), legendHost), chart.element),
    metricsHost,
    h('section', { class: 'card', 'aria-labelledby': 'day-table-title' }, h('h2', { class: 'card__title', id: 'day-table-title' }, t('stats.dailyBreakdown')), tableHost)
  );
}
