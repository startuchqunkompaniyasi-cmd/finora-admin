/**
 * pages/categories.js
 * Where the money goes (or comes from): total, share and count per category, plus a doughnut.
 * Each card links to Transactions pre-filtered to that category and period.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { PERIODS } from '../../../shared/periods.js';
import { formatMoney, formatPercent } from '../utils/format.js';
import { loadCategorySummaries } from '../services/categoriesService.js';
import { createChart } from '../components/baseChart.js';
import { choiceField, selectField } from '../components/form/fields.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { progressBar } from '../components/progressBar.js';
import { srTable } from '../components/srTable.js';

export const title = t('nav.categories');

function categoryCard(row, { kind, from, to, currency }) {
  const params = new URLSearchParams({ category: row.category.id, type: kind });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const isEmpty = row.count === 0;

  return h(
    'li',
    null,
    h(
      'a',
      { class: ['cat-card', 'card', isEmpty && 'is-empty'], href: `#/transactions?${params}` },
      h('span', { class: 'cat-row__icon', style: { '--category-color': row.category.color }, 'aria-hidden': 'true' }, row.category.icon),
      h(
        'span',
        { class: 'cat-card__body' },
        h('span', { class: 'cat-card__top' }, h('span', { class: 'cat-row__name' }, row.category.name), h('span', { class: 'cat-card__total num' }, formatMoney(row.total, currency))),
        progressBar({ value: row.share, color: row.category.color, label: `${row.category.name}: ${formatPercent(row.share, { digits: 0 })}` }),
        h(
          'span',
          { class: 'cat-card__meta num' },
          h('span', null, isEmpty ? t('categories.noActivity') : row.count === 1 ? t('categories.oneTransaction') : t('categories.transactions', { count: row.count })),
          h('span', null, formatPercent(row.share, { digits: 1 }))
        )
      )
    )
  );
}

export async function render(ctx) {
  let kind = ctx.query.get('kind') === 'income' ? 'income' : 'expense';
  let period = PERIODS.includes(ctx.query.get('period')) ? ctx.query.get('period') : 'month';
  let donut = null;
  let requestId = 0;

  const body = h('div', { class: 'cats' });
  ctx.onCleanup(() => donut?.destroy());

  function drawDonut(canvas, summary) {
    donut?.destroy();
    const rows = summary.rows.filter((row) => row.total > 0);
    try {
      donut = createChart(canvas, ({ cssVar, animation }) => ({
        type: 'doughnut',
        data: {
          labels: rows.map((row) => row.category.name),
          datasets: [{ data: rows.map((row) => row.total / 100), backgroundColor: rows.map((row) => row.category.color), borderColor: () => cssVar('--surface'), borderWidth: 3, hoverOffset: 4 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          animation,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: () => cssVar('--tooltip-bg'),
              titleColor: () => cssVar('--tooltip-text'),
              bodyColor: () => cssVar('--tooltip-text'),
              padding: 12,
              cornerRadius: 10,
              callbacks: { label: (item) => ` ${formatMoney(Math.round(item.parsed * 100), summary.baseCurrency)} (${formatPercent(rows[item.dataIndex].share, { digits: 1 })})` },
            },
          },
        },
      }));
    } catch (error) {
      console.error('[finora] Category chart failed to render', error);
      canvas.replaceWith(errorState({ title: t('chart.unavailable') }));
    }
  }

  function draw(summary) {
    const isExpense = summary.kind === 'expense';
    const hasData = summary.total > 0;
    const canvas = h('canvas', { role: 'img', 'aria-label': t(isExpense ? 'categories.chartTitleExpense' : 'categories.chartTitleIncome') });

    const chartCard = h(
      'section',
      { class: 'card cats__chart', 'aria-labelledby': 'cats-chart-title' },
      h('h2', { class: 'card__title', id: 'cats-chart-title' }, t(isExpense ? 'categories.chartTitleExpense' : 'categories.chartTitleIncome')),
      hasData
        ? h(
            'div',
            null,
            h('div', { class: 'donut' }, canvas, h('div', { class: 'donut__center' }, h('span', { class: 'donut__label' }, t(isExpense ? 'categories.spent' : 'categories.earned')), h('span', { class: 'donut__value num' }, formatMoney(summary.total, summary.baseCurrency)))),
            srTable({ caption: t(isExpense ? 'categories.chartTitleExpense' : 'categories.chartTitleIncome'), headers: [t('tx.category'), t('tx.amount')], rows: summary.rows.filter((r) => r.total > 0).map((r) => [r.category.name, formatMoney(r.total, summary.baseCurrency)]) })
          )
        : emptyState({ iconName: 'layoutGrid', title: t(isExpense ? 'categories.emptyExpense' : 'categories.emptyIncome'), text: t('categories.emptyHint') })
    );

    body.replaceChildren(
      chartCard,
      h('ul', { class: 'cats__list reset-list' }, summary.rows.map((row) => categoryCard(row, { kind: summary.kind, from: summary.from, to: summary.to, currency: summary.baseCurrency })))
    );
    body.removeAttribute('aria-busy');
    if (hasData) drawDonut(canvas, summary);
  }

  async function load() {
    const id = ++requestId;
    body.setAttribute('aria-busy', 'true');
    try {
      const summary = await loadCategorySummaries({ kind, period });
      if (id === requestId) draw(summary);
    } catch (error) {
      console.error('[finora] Failed to load categories', error);
      if (id === requestId) body.replaceChildren(h('div', { class: 'card' }, errorState({ title: t('dashboard.loadFailed'), text: t('dashboard.loadFailedHint'), onRetry: load })));
    }
  }

  const updateUrl = () => ctx.setQuery({ kind: kind === 'expense' ? '' : kind, period: period === 'month' ? '' : period });

  const kindField = choiceField({
    name: 'kind',
    label: t('tx.type'),
    variant: 'segmented',
    hideLegend: true,
    value: kind,
    options: [
      { value: 'expense', label: t('dashboard.expenses'), color: 'var(--negative)' },
      { value: 'income', label: t('dashboard.income'), color: 'var(--positive)' },
    ],
    onChange: (value) => {
      kind = value;
      updateUrl();
      load();
    },
  });
  const periodField = selectField({
    name: 'period',
    label: t('categories.period'),
    value: period,
    options: PERIODS.map((value) => ({ value, label: t(`period.${value}`) })),
    onChange: (value) => {
      period = value;
      updateUrl();
      load();
    },
  });

  // Initial draw happens after mount: Chart.js needs the canvas to be in the DOM to measure it.
  ctx.onMounted(load);

  return h(
    'div',
    null,
    h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('categories.title')), h('p', { class: 'page-header__subtitle' }, t('categories.subtitle')))),
    h('div', { class: 'toolbar' }, kindField.element, periodField.element),
    body
  );
}
