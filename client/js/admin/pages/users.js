/**
 * admin/pages/users.js
 * Foydalanuvchilar roʻyxati: qidiruv (ism, email, ID), holat/tarif filtri, saralash, sahifalash, CSV eksport.
 * Filtrlar manzilga yoziladi (#/admin/users?q=...), yangilashdan keyin saqlanadi. Roʻyxat joyida qayta chiziladi.
 * Parol xeshi va tokenlar API dan umuman kelmaydi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { selectField } from '../../components/form/fields.js';
import { at } from '../i18n.js';
import { get, exportUrl } from '../api.js';
import { fmtDate, fmtAgo, fmtNumber } from '../format.js';
import { pageHeader, card, badge, dataTable, pagination, debounce, loadingBlock, note } from '../components/ui.js';

export const title = at('adm.nav.users');

export async function render(ctx) {
  const { tariffs } = await get('/tariffs');
  const q = ctx.query;
  const state = { q: q.get('q') ?? '', status: q.get('status') ?? '', plan: q.get('plan') ?? '', sort: q.get('sort') ?? 'createdAt', dir: q.get('dir') ?? 'desc', page: Number(q.get('page')) || 1 };

  const search = h('input', { class: 'input', type: 'search', placeholder: at('adm.users.searchPlaceholder'), 'aria-label': at('adm.users.search'), value: state.q, maxlength: '80' });
  const status = selectField({ name: 'status', label: at('adm.col.status'), hideLabel: true, value: state.status, options: [{ value: '', label: at('adm.users.allStatuses') }, { value: 'active', label: at('adm.status.active') }, { value: 'suspended', label: at('adm.status.suspended') }] });
  const plan = selectField({ name: 'plan', label: at('adm.col.plan'), hideLabel: true, value: state.plan, options: [{ value: '', label: at('adm.users.allPlans') }, ...tariffs.map((x) => ({ value: x.id, label: x.name }))] });
  const sort = selectField({ name: 'sort', label: at('adm.users.sort'), hideLabel: true, value: `${state.sort}:${state.dir}`, options: [
    { value: 'createdAt:desc', label: at('adm.sort.newest') }, { value: 'createdAt:asc', label: at('adm.sort.oldest') },
    { value: 'name:asc', label: at('adm.sort.nameAsc') }, { value: 'lastActive:desc', label: at('adm.sort.lastActive') }, { value: 'transactions:desc', label: at('adm.sort.mostTx') }] });

  const results = h('div', { class: 'adm-results', 'aria-live': 'polite' });
  const exportLink = h('a', { class: 'btn btn--secondary btn--sm', href: '#', download: '' }, icon('download', { size: 16 }), at('adm.users.export'));

  const params = () => ({ q: state.q, status: state.status, plan: state.plan, sort: state.sort, dir: state.dir, page: state.page > 1 ? state.page : '' });

  async function load() {
    ctx.setQuery(params());
    exportLink.href = exportUrl('/users/export', { q: state.q, status: state.status, plan: state.plan });
    results.replaceChildren(loadingBlock());
    try {
      const data = await get('/users', { ...params(), pageSize: 20 });
      if (ctx.signal.aborted) return;
      results.replaceChildren(
        dataTable({
          caption: at('adm.nav.users'),
          empty: state.q || state.status || state.plan ? at('adm.users.noMatches') : at('adm.users.none'),
          rows: data.items,
          columns: [
            { key: 'name', label: at('adm.col.name'), render: (r) => h('a', { class: 'adm-person', href: `#/admin/user?id=${encodeURIComponent(r.id)}` }, h('strong', null, r.name), h('span', null, r.email)) },
            { key: 'plan', label: at('adm.col.plan'), render: (r) => badge(tariffs.find((x) => x.id === r.plan)?.name ?? r.plan) },
            { key: 'status', label: at('adm.col.status'), render: (r) => badge(at(`adm.status.${r.status}`), r.status === 'active' ? 'positive' : 'negative') },
            { key: 'createdAt', label: at('adm.col.registered'), render: (r) => fmtDate(r.createdAt) },
            { key: 'lastActiveAt', label: at('adm.col.lastActive'), render: (r) => fmtAgo(r.lastActiveAt) },
            { key: 'transactionCount', label: at('adm.col.txCount'), align: 'end', render: (r) => fmtNumber(r.transactionCount) },
          ],
        }),
        pagination({ page: data.page, pageSize: data.pageSize, total: data.total, onChange: (next) => { state.page = next; load(); window.scrollTo({ top: 0 }); } })
      );
    } catch (error) {
      if (!ctx.signal.aborted) results.replaceChildren(note(error.message, 'error'));
    }
  }

  const reload = (patch) => () => { Object.assign(state, patch(), { page: 1 }); load(); };
  search.addEventListener('input', debounce(() => { state.q = search.value.trim(); state.page = 1; load(); }, 300));
  status.control.addEventListener('change', reload(() => ({ status: status.getValue() })));
  plan.control.addEventListener('change', reload(() => ({ plan: plan.getValue() })));
  sort.control.addEventListener('change', reload(() => { const [s, d] = sort.getValue().split(':'); return { sort: s, dir: d }; }));

  load();
  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.users'), at('adm.users.subtitle'), exportLink),
    card(null, h('div', { class: 'adm-toolbar' }, h('div', { class: 'search adm-toolbar__search' }, icon('search', { size: 18, class: 'search__icon' }), search), status.element, plan.element, sort.element)),
    card(null, results, { flush: true })
  );
}
