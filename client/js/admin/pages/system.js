/**
 * admin/pages/system.js - tizim holati: baza, migratsiyalar, jarayon, jadvallar hajmi, soʻnggi server xatolari.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { at } from '../i18n.js';
import { get } from '../api.js';
import { fmtBytes, fmtDuration, fmtNumber, fmtDateTime } from '../format.js';
import { pageHeader, card, badge, emptyBlock, note } from '../components/ui.js';

export const title = at('adm.nav.system');

export async function render(ctx) {
  const s = await get('/system');
  const row = (label, value) => h('li', null, h('span', null, label), typeof value === 'string' ? h('strong', null, value) : value);
  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.system'), at('adm.sys.subtitle'), h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => ctx.refresh() }, icon('refresh', { size: 16 }), at('adm.refresh'))),
    h('div', { class: 'adm-grid adm-grid--3' },
      card(at('adm.sys.services'), h('ul', { class: 'adm-kv reset-list' },
        row(at('adm.health.db'), badge(s.dbOk ? at('adm.ok') : at('adm.bad'), s.dbOk ? 'positive' : 'negative')),
        row(at('adm.sys.maintenance'), badge(s.maintenanceMode ? at('adm.on') : at('adm.off'), s.maintenanceMode ? 'warning' : 'positive')),
        row(at('adm.health.dbSize'), fmtBytes(s.dbSizeBytes)),
        row(at('adm.health.migrations'), `${s.migrations} (${s.lastMigration ?? '—'})`))),
      card(at('adm.sys.server'), h('ul', { class: 'adm-kv reset-list' }, row('Node.js', s.server.nodeVersion), row(at('adm.sys.env'), s.server.env), row(at('adm.sys.uptime'), fmtDuration(s.server.uptimeSeconds)), row(at('adm.sys.memory'), fmtBytes(s.server.rssBytes)))),
      card(at('adm.sys.tables'), h('ul', { class: 'adm-kv reset-list' }, Object.entries(s.tables).map(([name, n]) => row(name, fmtNumber(n)))))),
    card(at('adm.sys.errors'), s.recentErrors.length ? h('ul', { class: 'adm-feed reset-list' }, s.recentErrors.map((e) => h('li', null, h('span', { class: 'adm-feed__main' }, e.message), h('span', { class: 'adm-feed__time' }, fmtDateTime(e.at))))) : emptyBlock(at('adm.sys.noErrors'))),
    note(at('adm.sys.backup'))
  );
}
