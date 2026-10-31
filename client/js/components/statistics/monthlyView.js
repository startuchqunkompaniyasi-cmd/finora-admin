/**
 * components/statistics/monthlyView.js
 * Yanvardan dekabrgacha grafik (tanlangan oy ajralib turadi) + tanlangan oy koʻrsatkichlari.
 * Oyni grafikdagi ustunni bosib, strelkalar yoki tanlagichlar bilan almashtirish mumkin.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { categoryBreakdown, monthSeries, monthStatistics } from '../../../../shared/stats.js';
import { formatMoney, formatPercent, formatShortDay, monthNameCapitalized } from '../../utils/format.js';
import { monthChartData } from '../../utils/chartData.js';
import { selectField } from '../form/fields.js';
import { categoryBreakdownCard } from '../dashboard/categoryBreakdownCard.js';
import { incomeExpenseChart } from '../incomeExpenseChart.js';
import { legend } from '../legend.js';
import { metricCard, metricGrid, toneOf } from './metricCard.js';
import { periodNav } from './periodNav.js';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function monthlyView({ ctx, data }) {
  const { baseCurrency: currency, today, transactions, years } = data;
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const oldestYear = years.at(-1);

  const requestedYear = Number(ctx.query.get('year'));
  const requestedMonth = Number(ctx.query.get('month'));
  let year = years.includes(requestedYear) ? requestedYear : currentYear;
  let month = MONTHS.includes(requestedMonth) ? requestedMonth : year === currentYear ? currentMonth : 12;

  const monthSelect = selectField({ name: 'month', label: t('stats.month'), hideLabel: true, value: String(month), options: MONTHS.map((m) => ({ value: String(m), label: monthNameCapitalized(m) })), onChange: (v) => select(year, Number(v)) });
  const yearSelect = selectField({ name: 'year', label: t('stats.year'), hideLabel: true, value: String(year), options: years.map((y) => ({ value: String(y), label: String(y) })), onChange: (v) => select(Number(v), month) });

  const nav = periodNav({
    center: h('div', { class: 'period-nav__selects' }, monthSelect.element, yearSelect.element),
    prevLabel: t('stats.prevMonth'),
    nextLabel: t('stats.nextMonth'),
    onPrev: () => step(-1),
    onNext: () => step(1),
    today: { label: t('period.month'), onClick: () => select(currentYear, currentMonth) },
  });

  const legendHost = h('div');
  const metricsHost = h('div');
  const categoriesHost = h('div');

  let months = monthSeries(transactions, year, currency);
  const chart = incomeExpenseChart({
    lifecycle: ctx,
    currency,
    ariaLabel: t('stats.monthChartTitle'),
    initial: { ...monthChartData(months, year), highlightIndex: month - 1 },
    onSelect: (index) => select(year, index + 1),
  });

  function draw() {
    months = monthSeries(transactions, year, currency);
    const stats = monthStatistics(transactions, year, month, today, currency);
    const isCurrent = year === currentYear && month === currentMonth;

    monthSelect.setValue(String(month));
    yearSelect.setValue(String(year));
    nav.update({ prevDisabled: year <= oldestYear && month === 1, nextDisabled: isCurrent || (year === currentYear && month >= currentMonth), showToday: !isCurrent });
    chart.update({ ...monthChartData(months, year), highlightIndex: month - 1 });

    const yearIncome = months.reduce((sum, m) => sum + m.income, 0);
    const yearExpense = months.reduce((sum, m) => sum + m.expense, 0);
    legendHost.replaceChildren(legend([{ label: t('chart.income'), colorVar: '--positive', amount: yearIncome }, { label: t('chart.expense'), colorVar: '--negative', amount: yearExpense }], currency));

    const extreme = (entry) => (entry ? { value: formatMoney(entry.amount, currency), hint: `${entry.transaction.category.name}, ${formatShortDay(entry.transaction.dayKey)}` } : { value: '\u2014', hint: t('stats.noneRecorded') });
    const largestExpense = extreme(stats.largestExpense);
    const largestIncome = extreme(stats.largestIncome);

    metricsHost.replaceChildren(
      metricGrid([
        metricCard({ label: t('stats.totalIncome'), value: formatMoney(stats.income, currency), tone: 'positive' }),
        metricCard({ label: t('stats.totalExpense'), value: formatMoney(stats.expense, currency), tone: 'negative' }),
        metricCard({ label: t('stats.savings'), value: formatMoney(stats.net, currency, { sign: true }), tone: toneOf(stats.net), hint: stats.savingsRate === null ? t('stats.noIncomeHint') : t('stats.savingsRateHint', { rate: formatPercent(stats.savingsRate, { digits: 0 }) }) }),
        metricCard({ label: t('stats.avgDailySpending'), value: formatMoney(stats.avgDailyExpense, currency), hint: stats.daysCounted ? t('stats.overDays', { days: stats.daysCounted }) : undefined }),
        metricCard({ label: t('stats.avgDailyIncome'), value: formatMoney(stats.avgDailyIncome, currency), hint: stats.daysCounted ? t('stats.overDays', { days: stats.daysCounted }) : undefined }),
        metricCard({ label: t('stats.largestExpense'), value: largestExpense.value, hint: largestExpense.hint, tone: stats.largestExpense ? 'negative' : undefined }),
        metricCard({ label: t('stats.largestIncome'), value: largestIncome.value, hint: largestIncome.hint, tone: stats.largestIncome ? 'positive' : undefined }),
      ])
    );

    const spending = categoryBreakdown(stats.transactions, currency, 'expense').map((row) => ({ ...row, category: data.categories.get(row.categoryId) }));
    categoriesHost.replaceChildren(categoryBreakdownCard({ spending, currency, today: `${year}-${String(month).padStart(2, '0')}-01` }));
  }

  function select(nextYear, nextMonth) {
    year = nextYear;
    month = nextMonth;
    const isCurrent = year === currentYear && month === currentMonth;
    ctx.setQuery({ tab: 'monthly', year: isCurrent ? '' : year, month: isCurrent ? '' : month });
    draw();
  }

  function step(delta) {
    const index = year * 12 + (month - 1) + delta;
    select(Math.floor(index / 12), (index % 12) + 1);
  }

  draw();

  return h(
    'div',
    { class: 'stats-view' },
    nav.element,
    h('section', { class: 'card', 'aria-labelledby': 'month-chart-title' }, h('div', { class: 'card__header weekly__header' }, h('div', null, h('h2', { class: 'card__title', id: 'month-chart-title' }, t('stats.monthChartTitle')), h('p', { class: 'card__subtitle' }, t('stats.monthChartHint'))), legendHost), chart.element),
    metricsHost,
    categoriesHost
  );
}
