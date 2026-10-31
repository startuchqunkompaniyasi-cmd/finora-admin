/**
 * components/transactions/filterBar.js
 * Search, type, category, date range and sort. Calls onChange(query) with the full raw query;
 * the page normalises it (shared/transactionQuery.js). Search is debounced.
 * On phones only search + type are visible; the rest opens with the "Filters" button.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { DEFAULT_QUERY, isDefaultQuery, SORTS } from '../../../../shared/transactionQuery.js';
import { LIMITS } from '../../../../shared/constants.js';
import { choiceField, selectField, textField } from '../form/fields.js';

const SORT_LABELS = { 'date-desc': 'sort.newest', 'date-asc': 'sort.oldest', 'amount-desc': 'sort.highest', 'amount-asc': 'sort.lowest' };

/** @returns {{element: HTMLElement, reset: () => void}} */
export function createFilterBar({ filters, categories, today, onChange }) {
  const state = { ...filters };
  let debounceTimer;

  const emit = (patch) => {
    Object.assign(state, patch);
    syncChrome();
    onChange({ ...state });
  };

  // --- search
  const searchInput = h('input', { class: 'input search__input', type: 'search', name: 'q', maxlength: LIMITS.searchMax, placeholder: t('tx.searchPlaceholder'), 'aria-label': t('tx.search'), autocomplete: 'off' });
  searchInput.value = state.q;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => emit({ q: searchInput.value }), 150);
  });
  const search = h('div', { class: 'search' }, icon('search', { size: 18, class: 'search__icon' }), searchInput);

  // --- type
  const type = choiceField({
    name: 'filter-type',
    label: t('tx.type'),
    variant: 'segmented',
    hideLegend: true,
    value: state.type,
    options: [
      { value: 'all', label: t('tx.all') },
      { value: 'income', label: t('tx.income'), color: 'var(--positive)' },
      { value: 'expense', label: t('tx.expense'), color: 'var(--negative)' },
    ],
    onChange: (value) => emit({ type: value }),
  });

  // --- extras
  const category = selectField({
    name: 'category',
    label: t('tx.category'),
    value: state.categoryId,
    options: [{ value: '', label: t('tx.allCategories') }, ...categories.map((c) => ({ value: c.id, label: `${c.icon}  ${c.name}` }))],
    onChange: (value) => emit({ categoryId: value }),
  });
  const from = textField({ name: 'from', label: t('tx.from'), type: 'date', value: state.from, attrs: { max: today } });
  const to = textField({ name: 'to', label: t('tx.to'), type: 'date', value: state.to, attrs: { max: today } });
  from.control.addEventListener('change', () => emit({ from: from.getValue() }));
  to.control.addEventListener('change', () => emit({ to: to.getValue() }));
  const sort = selectField({
    name: 'sort',
    label: t('tx.sortBy'),
    value: state.sort,
    options: SORTS.map((value) => ({ value, label: t(SORT_LABELS[value]) })),
    onChange: (value) => emit({ sort: value }),
  });

  const extras = h('div', { class: 'filters__extras', id: 'filters-extras' }, category.element, from.element, to.element, sort.element);

  // --- chrome: mobile toggle, active count, reset
  const countBadge = h('span', { class: 'badge badge--info', hidden: true });
  const toggle = h('button', { class: 'btn btn--secondary filters__toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'filters-extras' }, icon('sliders', { size: 18 }), t('tx.filters'), countBadge);
  toggle.addEventListener('click', () => {
    const open = extras.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  const resetButton = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', hidden: true, onClick: () => reset() }, icon('x', { size: 14 }), t('tx.clearFilters'));

  function syncChrome() {
    const extrasActive = ['categoryId', 'from', 'to', 'sort'].filter((key) => state[key] !== DEFAULT_QUERY[key]).length;
    countBadge.textContent = String(extrasActive);
    countBadge.hidden = extrasActive === 0;
    resetButton.hidden = isDefaultQuery({ ...state, q: state.q.trim() });
  }

  function reset() {
    clearTimeout(debounceTimer);
    searchInput.value = '';
    type.setValue('all');
    category.setValue('');
    from.setValue('');
    to.setValue('');
    sort.setValue(DEFAULT_QUERY.sort);
    emit({ ...DEFAULT_QUERY });
  }

  syncChrome();
  if (['categoryId', 'from', 'to', 'sort'].some((key) => state[key] !== DEFAULT_QUERY[key])) extras.classList.add('is-open');

  const element = h(
    'div',
    { class: 'filters', role: 'search' },
    h('div', { class: 'filters__primary' }, search, type.element, toggle),
    extras,
    h('div', { class: 'filters__footer' }, resetButton)
  );

  return { element, reset };
}
