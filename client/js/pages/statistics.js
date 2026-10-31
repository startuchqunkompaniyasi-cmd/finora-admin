/**
 * pages/statistics.js
 * Haftalik / Oylik / Yillik statistika + aqlli tahlillar. Bo'limlar havola-tab: manzil (#/statistics?tab=monthly)
 * ulashiladi, orqaga tugmasi ishlaydi va har bir tab alohida yuklanadi.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { loadStatisticsData } from '../services/statisticsService.js';
import { emptyState } from '../components/emptyState.js';
import { insightsCard } from '../components/insights/insightsCard.js';
import { openTransactionModal } from '../components/transactionForm.js';
import { monthlyView } from '../components/statistics/monthlyView.js';
import { weeklyView } from '../components/statistics/weeklyView.js';
import { yearlyView } from '../components/statistics/yearlyView.js';

export const title = t('nav.statistics');

const TABS = [
  { id: 'weekly', labelKey: 'stats.weekly', view: weeklyView },
  { id: 'monthly', labelKey: 'stats.monthly', view: monthlyView },
  { id: 'yearly', labelKey: 'stats.yearly', view: yearlyView },
];

export async function render(ctx) {
  const data = await loadStatisticsData();
  const active = TABS.find((tab) => tab.id === ctx.query.get('tab')) ?? TABS[0];

  const header = h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('stats.title')), h('p', { class: 'page-header__subtitle' }, t('stats.subtitle'))));

  if (data.transactions.length === 0) {
    return h(
      'div',
      null,
      header,
      h('div', { class: 'card' }, emptyState({
        iconName: 'barChart',
        title: t('stats.emptyTitle'),
        text: t('stats.emptyText'),
        action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openTransactionModal() }, icon('plus', { size: 18 }), t('topbar.addTransaction')),
      }))
    );
  }

  const tabs = h(
    'nav',
    { class: 'tabs', 'aria-label': t('stats.tabs') },
    TABS.map((tab) => h('a', { class: 'tabs__link', href: `#/statistics?tab=${tab.id}`, 'aria-current': tab.id === active.id ? 'page' : undefined }, t(tab.labelKey)))
  );

  return h('div', null, header, tabs, active.view({ ctx, data }), insightsCard({ insights: data.insights, showEmpty: true }));
}
