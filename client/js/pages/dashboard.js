/**
 * pages/dashboard.js
 * Composes the dashboard from widgets. All numbers come from services/dashboardService.js.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { formatLongDay, formatMonthYear, formatPercent, greetingKey } from '../utils/format.js';
import { icon } from '../utils/icons.js';
import { loadDashboardData } from '../services/dashboardService.js';
import { getUsdUzsSnapshot } from '../services/exchangeService.js';
import { clearDemoData } from '../data/seed.js';
import { toast } from '../components/toast.js';
import { skeleton as skeletonBlock, loadingRegion } from '../components/skeleton.js';
import { openTransactionModal } from '../components/transactionForm.js';
import { balanceCard } from '../components/dashboard/balanceCard.js';
import { statCard } from '../components/dashboard/statCard.js';
import { weeklyOverviewCard } from '../components/dashboard/weeklyOverviewCard.js';
import { rateCard } from '../components/dashboard/rateCard.js';
import { recentTransactionsCard } from '../components/dashboard/recentTransactionsCard.js';
import { categoryBreakdownCard } from '../components/dashboard/categoryBreakdownCard.js';
import { insightsCard } from '../components/insights/insightsCard.js';
import { progressBar } from '../components/progressBar.js';

export const title = t('nav.dashboard');

function pageHeader(data) {
  const firstName = data.profile.name.trim().split(/\s+/)[0];
  const greeting = firstName ? `${t(greetingKey(data.hour))}, ${firstName}` : t(greetingKey(data.hour));

  return h(
    'header',
    { class: 'page-header' },
    h('div', null, h('h1', { class: 'page-header__title' }, greeting, ' ', h('span', { 'aria-hidden': 'true' }, '\u{1F44B}')), h('p', { class: 'page-header__subtitle' }, t('dashboard.subtitle'))),
    h('p', { class: 'page-header__subtitle' }, formatLongDay(data.today))
  );
}

function demoBanner() {
  const button = h('button', { class: 'btn btn--secondary btn--sm', type: 'button' }, t('dashboard.clearDemo'));
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await clearDemoData(); // repositories emit data:changed, which re-renders this page
      toast.success(t('dashboard.demoCleared'));
    } catch (error) {
      console.error('[finora] Failed to clear sample data', error);
      toast.error(error.message);
      button.disabled = false;
    }
  });

  return h(
    'div',
    { class: 'banner', role: 'note' },
    h('span', { class: 'banner__icon' }, icon('info', { size: 20 })),
    h('p', { class: 'banner__text' }, h('strong', null, t('dashboard.demoBanner')), ' ', t('dashboard.demoBannerHint')),
    button
  );
}

function savingsNote(data) {
  const { month, baseCurrency } = data;
  if (month.savingsRate === null) return { note: t('dashboard.noIncomeYet') };

  return {
    extra: h(
      'div',
      { class: 'stat__rate' },
      progressBar({ value: month.savingsRate, tone: month.savingsRate < 0 ? 'negative' : 'positive', label: t('dashboard.savingsRate') }),
      h('span', { class: 'stat__rate-label num' }, `${t('dashboard.savingsRate')} ${formatPercent(month.savingsRate)}`)
    ),
  };
}

export async function render(ctx) {
  const data = await loadDashboardData();
  const { baseCurrency, month } = data;

  // One request shared by the balance card (equivalent value) and the rate card.
  const ratePromise = getUsdUzsSnapshot();
  ratePromise.catch(() => {}); // each consumer reports its own failure

  const monthLabel = formatMonthYear(data.today);
  const savings = savingsNote(data);

  return h(
    'div',
    { class: 'dash-wrap' },
    pageHeader(data),
    data.profile.hasDemoData ? demoBanner() : null,
    h(
      'div',
      { class: 'dash' },
      balanceCard({ balance: data.balance, change: data.balanceChange, trend: data.balanceTrend, currency: baseCurrency, ratePromise, className: 'dash__balance', lifecycle: ctx }),
      statCard({ label: t('dashboard.income'), iconName: 'arrowDownLeft', tone: 'positive', amount: month.income, currency: baseCurrency, note: monthLabel, className: 'dash__income', lifecycle: ctx }),
      statCard({ label: t('dashboard.expenses'), iconName: 'arrowUpRight', tone: 'negative', amount: month.expense, currency: baseCurrency, note: monthLabel, className: 'dash__expense', lifecycle: ctx }),
      statCard({ label: t('dashboard.savings'), iconName: 'piggyBank', tone: 'info', amount: month.net, currency: baseCurrency, valueTone: month.net < 0 ? 'negative' : undefined, className: 'dash__savings', lifecycle: ctx, ...savings }),
      insightsCard({ insights: data.insights, linkHref: '#/statistics', className: 'dash__insights' }),
      weeklyOverviewCard({ week: data.week, totals: data.weekTotals, weekStart: data.weekStart, weekEnd: data.weekEnd, currency: baseCurrency, className: 'dash__weekly', lifecycle: ctx }),
      rateCard({ ratePromise, className: 'dash__rate' }),
      recentTransactionsCard({ transactions: data.recent, timezone: data.timezone, today: data.today, onAdd: () => openTransactionModal(), className: 'dash__recent' }),
      categoryBreakdownCard({ spending: data.spending, currency: baseCurrency, today: data.today, className: 'dash__categories' })
    )
  );
}

/** Same grid as the real page, so nothing jumps when the data arrives. */
export function skeleton() {
  const card = (className, height) => h('div', { class: ['card', className] }, skeletonBlock({ height }));
  return loadingRegion(
    h(
      'div',
      { class: 'dash-wrap' },
      h('div', { class: 'dash-skeleton-title' }, skeletonBlock({ width: 240, height: 30 }), skeletonBlock({ width: 180, height: 16 })),
      h(
        'div',
        { class: 'dash' },
        card('dash__balance', 230),
        card('dash__income', 92),
        card('dash__expense', 92),
        card('dash__savings', 92),
        card('dash__insights', 150),
        card('dash__weekly', 300),
        card('dash__rate', 300),
        card('dash__recent', 320),
        card('dash__categories', 320)
      )
    ),
    t('loading.dashboard')
  );
}
