/**
 * components/dashboard/weeklyOverviewCard.js
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { formatDayRange, formatMoney, formatWeekday } from '../../utils/format.js';
import { weekChartData } from '../../utils/chartData.js';
import { emptyState } from '../emptyState.js';
import { incomeExpenseChart } from '../incomeExpenseChart.js';
import { legend } from '../legend.js';
import { srTable } from '../srTable.js';

export function weeklyOverviewCard({ week, totals, weekStart, weekEnd, currency, className = '', lifecycle }) {
  const hasData = week.some((day) => day.income > 0 || day.expense > 0);
  const chart = hasData ? incomeExpenseChart({ lifecycle, currency, ariaLabel: `${t('dashboard.weeklyOverview')}: ${t('chart.income')}, ${t('chart.expense')}`, initial: weekChartData(week) }) : null;

  return h(
    'section',
    { class: ['card', className], 'aria-labelledby': 'weekly-title' },
    h(
      'div',
      { class: 'card__header weekly__header' },
      h('div', null, h('h2', { class: 'card__title', id: 'weekly-title' }, t('dashboard.weeklyOverview')), h('p', { class: 'card__subtitle' }, formatDayRange(weekStart, weekEnd))),
      legend([{ label: t('chart.income'), colorVar: '--positive', amount: totals.income }, { label: t('chart.expense'), colorVar: '--negative', amount: totals.expense }], currency)
    ),
    hasData
      ? h(
          'div',
          null,
          chart.element,
          srTable({
            caption: t('dashboard.weeklyOverview'),
            headers: [t('stats.day'), t('chart.income'), t('chart.expense')],
            rows: week.map((day) => [formatWeekday(day.dayKey), formatMoney(day.income, currency), formatMoney(day.expense, currency)]),
          })
        )
      : emptyState({ iconName: 'barChart', title: t('empty.noWeek'), text: t('empty.addFirst') })
  );
}
