/**
 * admin/pages/audit.js
 * Audit jurnali (faqat oʻqish; server tomonda append-only). Kim, nima, qachon, qaysi yozuv, sababi va natijasi.
 */

import { h } from '../../core/dom.js';
import { selectField } from '../../components/form/fields.js';
import { at, hasKey } from '../i18n.js';
import { get } from '../api.js';
import { fmtDateTime } from '../format.js';
import { pageHeader, card, badge, dataTable, pagination, loadingBlock, note, actionLabel } from '../components/ui.js';

export const title = at('adm.nav.audit');

const ACTIONS = ['admin.login', 'admin.logout', 'admin.password_change', 'admin.username_change', 'admin.sessions_revoked', 'user.update', 'user.suspend', 'user.reactivate', 'user.plan_change', 'users.export', 'tariff.create', 'tariff.update', 'tariff.price_change', 'tariff.delete', 'settings.update'];

function detailsText(details) {
  if (!details) return '—';
  const text = JSON.stringify(details);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export async function render(ctx) {
  const state = { action: ctx.query.get('action') ?? '', page: Number(ctx.query.get('page')) || 1 };
  const filter = selectField({ name: 'action', label: at('adm.audit.action'), hideLabel: true, value: state.action, options: [{ value: '', label: at('adm.audit.allActions') }, ...ACTIONS.filter((a) => hasKey(`adm.action.${a}`)).map((a) => ({ value: a, label: actionLabel(a) }))] });
  const results = h('div', { 'aria-live': 'polite' });

  async function load() {
    ctx.setQuery({ action: state.action, page: state.page > 1 ? state.page : '' });
    results.replaceChildren(loadingBlock());
    try {
      const data = await get('/audit', { action: state.action, page: state.page, pageSize: 25 });
      if (ctx.signal.aborted) return;
      results.replaceChildren(
        dataTable({ caption: at('adm.nav.audit'), empty: at('adm.noAudit'), rows: data.items, columns: [
          { key: 'createdAt', label: at('adm.col.date'), render: (r) => fmtDateTime(r.createdAt) },
          { key: 'adminUsername', label: at('adm.col.admin') },
          { key: 'action', label: at('adm.audit.action'), render: (r) => actionLabel(r.action) },
          { key: 'entityId', label: at('adm.audit.record'), render: (r) => (r.entityId ? h('code', { class: 'adm-code' }, `${r.entityType ?? ''}:${String(r.entityId).slice(0, 12)}`) : '—') },
          { key: 'reason', label: at('adm.reason'), render: (r) => r.reason ?? '—' },
          { key: 'details', label: at('adm.audit.details'), render: (r) => h('code', { class: 'adm-code adm-code--wrap' }, detailsText(r.details)) },
          { key: 'result', label: at('adm.audit.result'), render: (r) => badge(r.result === 'success' ? at('adm.ok') : at('adm.bad'), r.result === 'success' ? 'positive' : 'negative') },
        ] }),
        pagination({ page: data.page, pageSize: data.pageSize, total: data.total, onChange: (n) => { state.page = n; load(); } }));
    } catch (error) {
      if (!ctx.signal.aborted) results.replaceChildren(note(error.message, 'error'));
    }
  }
  filter.control.addEventListener('change', () => { state.action = filter.getValue(); state.page = 1; load(); });
  load();
  return h('div', { class: 'adm-page' }, pageHeader(at('adm.nav.audit'), at('adm.audit.subtitle')), card(null, h('div', { class: 'adm-toolbar' }, filter.element)), card(null, results, { flush: true }), note(at('adm.audit.note')));
}
