/**
 * pages/transactions.js
 * Full history: search, filters, sort, add / edit / delete, export.
 * Filters live in the URL (#/transactions?type=expense&category=food), so they survive refresh,
 * work with the back button and can be linked to from other pages (Categories).
 */

import { h } from '../core/dom.js';
import { config } from '../core/config.js';
import { icon } from '../utils/icons.js';
import { t } from '../i18n/index.js';
import { formatMoney } from '../utils/format.js';
import { summarize } from '../../../shared/stats.js';
import { EXPORT_FORMATS } from '../../../shared/exportFormats.js';
import { DEFAULT_QUERY, normalizeQuery, queryTransactions } from '../../../shared/transactionQuery.js';
import { loadTransactionsData, deleteTransaction } from '../services/transactionsService.js';
import { exportTransactions } from '../services/exportService.js';
import { openTransactionModal } from '../components/transactionForm.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { createDropdown } from '../components/dropdown.js';
import { emptyState } from '../components/emptyState.js';
import { skeleton as skeletonBlock, loadingRegion } from '../components/skeleton.js';
import { toast } from '../components/toast.js';
import { createFilterBar } from '../components/transactions/filterBar.js';
import { resultsSummary } from '../components/transactions/resultsSummary.js';
import { transactionGroups } from '../components/transactions/transactionGroups.js';

export const title = t('nav.transactions');

const queryFromUrl = (params) =>
  normalizeQuery({ q: params.get('q'), type: params.get('type'), categoryId: params.get('category'), from: params.get('from'), to: params.get('to'), sort: params.get('sort') });

/** Only non-default values go into the URL, so the default page keeps a clean address. */
function urlParams(query) {
  return {
    q: query.q,
    type: query.type === DEFAULT_QUERY.type ? '' : query.type,
    category: query.categoryId,
    from: query.from,
    to: query.to,
    sort: query.sort === DEFAULT_QUERY.sort ? '' : query.sort,
  };
}

function exportMenu() {
  return createDropdown({
    label: t('tx.export'),
    triggerClass: 'btn btn--secondary',
    triggerContent: [icon('download', { size: 18 }), h('span', null, t('tx.export')), icon('chevronDown', { size: 14 })],
    renderPanel: ({ close }) =>
      h(
        'div',
        null,
        h('div', { class: 'menu__header' }, h('p', { class: 'menu__title' }, t('tx.exportTitle'))),
        Object.entries(EXPORT_FORMATS).map(([key, format]) =>
          h(
            'button',
            {
              class: 'menu__item menu__item--stacked',
              type: 'button',
              onClick: async () => {
                close();
                try {
                  const { count, filename } = await exportTransactions(key);
                  toast.success(t('tx.exported', { count, name: filename }));
                } catch (error) {
                  console.error('[finora] Export failed', error);
                  toast.error(t('tx.exportFailed'));
                }
              },
            },
            icon('download', { size: 18 }),
            h('span', null, h('span', { class: 'menu__title', style: { display: 'block' } }, format.label), h('span', { class: 'menu__text', style: { display: 'block' } }, format.description))
          )
        )
      ),
  });
}

export async function render(ctx) {
  const data = await loadTransactionsData();
  const { baseCurrency, timezone, today } = data;
  const categoryName = (id) => data.categories.get(id).name;

  let filters = queryFromUrl(ctx.query);
  let visibleCount = config.pageSize;

  const summaryHost = h('div');
  const listHost = h('div', { 'aria-live': 'polite' });
  let filterBar;

  const header = h(
    'header',
    { class: 'page-header' },
    h('div', null, h('h1', { class: 'page-header__title' }, t('tx.title')), h('p', { class: 'page-header__subtitle' }, t('tx.subtitle', { count: data.transactions.length }))),
    h('div', { class: 'page-header__actions' }, exportMenu().root, h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openTransactionModal() }, icon('plus', { size: 18 }), t('topbar.addTransaction')))
  );

  const handlers = {
    onEdit: (transaction) => openTransactionModal({ transaction }),
    async onDelete(transaction) {
      const name = transaction.description || transaction.category.name;
      const signed = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      const confirmed = await confirmDialog({
        title: t('tx.deleteTitle'),
        message: t('tx.deleteMessage', { name, amount: formatMoney(signed, transaction.currency, { sign: true }) }),
        confirmLabel: t('common.delete'),
      });
      if (!confirmed) return;
      try {
        await deleteTransaction(transaction.id); // emits data:changed -> this page re-renders
        toast.success(t('tx.deleted'));
      } catch (error) {
        console.error('[finora] Delete failed', error);
        toast.error(t('tx.deleteFailed'));
      }
    },
  };

  function renderResults({ focusIndex } = {}) {
    const rows = queryTransactions(data.transactions, filters, { baseCurrency, categoryName });
    summaryHost.replaceChildren(resultsSummary({ summary: summarize(rows, baseCurrency), currency: baseCurrency }));

    if (rows.length === 0) {
      listHost.replaceChildren(
        emptyState({
          iconName: 'search',
          title: t('tx.noMatches'),
          text: t('tx.noMatchesHint'),
          action: h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => filterBar.reset() }, t('tx.clearFilters')),
        })
      );
      return;
    }

    const shown = rows.slice(0, visibleCount);
    const remaining = rows.length - shown.length;
    listHost.replaceChildren(
      transactionGroups({ rows: shown, grouped: filters.sort.startsWith('date'), baseCurrency, timezone, today, ...handlers }),
      remaining > 0
        ? h(
            'div',
            { class: 'load-more' },
            h(
              'button',
              {
                class: 'btn btn--secondary',
                type: 'button',
                onClick: () => {
                  const previous = visibleCount;
                  visibleCount += config.pageSize;
                  renderResults({ focusIndex: previous }); // keep keyboard users where they were
                },
              },
              t('tx.showMore', { count: Math.min(remaining, config.pageSize) })
            )
          )
        : null
    );

    if (focusIndex !== undefined) listHost.querySelector(`[data-index="${focusIndex}"]`)?.focus();
  }

  // Nothing recorded yet: a single clear invitation instead of empty filters and totals.
  if (data.transactions.length === 0) {
    return h(
      'div',
      null,
      header,
      h('div', { class: 'card' }, emptyState({
        iconName: 'creditCard',
        title: t('empty.noTransactions'),
        text: t('empty.addFirst'),
        action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openTransactionModal() }, icon('plus', { size: 18 }), t('topbar.addTransaction')),
      }))
    );
  }

  filterBar = createFilterBar({
    filters,
    categories: data.categories.list,
    today,
    onChange: (raw) => {
      filters = normalizeQuery(raw);
      visibleCount = config.pageSize;
      ctx.setQuery(urlParams(filters));
      renderResults();
    },
  });

  renderResults();
  return h('div', { class: 'tx-page' }, header, filterBar.element, summaryHost, listHost);
}

export function skeleton() {
  return loadingRegion(h('div', { class: 'tx-page' }, skeletonBlock({ width: 220, height: 30 }), skeletonBlock({ height: 120 }), skeletonBlock({ height: 360 })), t('loading.transactions'));
}
