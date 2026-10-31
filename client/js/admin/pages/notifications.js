/**
 * admin/pages/notifications.js
 * Bildirishnomalar: yangi roʻyxatdan oʻtishlar, server xatolari, xavfsizlik ogohlantirishlari, tarif va
 * administrator amallari. Hammasi haqiqiy yozuvlardan yigʻiladi (alohida bildirishnoma jadvali yoʻq).
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { at } from '../i18n.js';
import { get } from '../api.js';
import { fmtAgo } from '../format.js';
import { pageHeader, card, emptyBlock, actionLabel } from '../components/ui.js';

export const title = at('adm.nav.notifications');

const ICONS = { registration: 'user', error: 'alertCircle', security: 'lock', tariff: 'crown', action: 'pencil' };

export async function render(ctx) {
  const { items, failedLogins24h } = await get('/notifications');
  const text = (n) => {
    if (n.type === 'registration') return at('adm.notif.registration', { name: n.text });
    if (n.type === 'error') return at('adm.notif.error', { message: n.text });
    if (n.type === 'security' && !n.action) return at('adm.notif.failedLogins', { n: n.count });
    return at('adm.notif.action', { action: actionLabel(n.action), actor: n.actor ?? '', target: n.text });
  };
  const list = items.length
    ? h('ul', { class: 'adm-notifs reset-list' }, items.map((n) => h('li', { class: `adm-notif adm-notif--${n.severity}` }, h('span', { class: 'adm-notif__icon' }, icon(ICONS[n.type] ?? 'info', { size: 18 })), h('span', { class: 'adm-notif__text' }, text(n)), h('time', { class: 'adm-notif__time', datetime: n.at }, fmtAgo(n.at)))))
    : emptyBlock(at('adm.notif.none'));
  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.notifications'), failedLogins24h ? at('adm.notif.failed24', { n: failedLogins24h }) : at('adm.notif.subtitle'), h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => ctx.refresh() }, icon('refresh', { size: 16 }), at('adm.refresh'))),
    card(null, list)
  );
}
