/**
 * admin/pages/analytics.js
 * Foydalanish tahlili. Faqat bazada HAQIQATAN mavjud maʼlumot: tarixiy koʻrsatkichlar yozuvlardan
 * (roʻyxatdan oʻtish, yaratilgan tranzaksiyalar), DAU/WAU/MAU — oxirgi faollik vaqtidan (hozirgi holat).
 * Sahifa koʻrishlari va seanslar tarixi yigʻilmaydi (maxfiylik) — bu ochiq aytiladi.
 */

import { h } from '../../core/dom.js';
import { at } from '../i18n.js';
import { get } from '../api.js';
import { fmtNumber } from '../format.js';
import { pageHeader, card, statCard, dataTable, note } from '../components/ui.js';
import { timeChart, shortDay } from '../components/charts.js';

export const title = at('adm.nav.analytics');

export async function render(ctx) {
  const days = [7, 30, 90].includes(Number(ctx.query.get('days'))) ? Number(ctx.query.get('days')) : 30;
  const [a, { tariffs }] = await Promise.all([get('/analytics', { days }), get('/tariffs')]);
  const name = (id) => tariffs.find((x) => x.id === id)?.name ?? id;

  const range = h('div', { class: 'adm-presets', role: 'group', 'aria-label': at('adm.range') }, [7, 30, 90].map((d) => h('button', { class: ['btn btn--sm', d === days ? 'btn--primary' : 'btn--secondary'].join(' '), type: 'button', 'aria-pressed': String(d === days), onClick: () => { ctx.setQuery({ days: d }); ctx.refresh(); } }, at('adm.lastDays', { n: d }))));
  const labels = a.series.map((p) => shortDay(p.day));
  const total = Math.max(1, a.newVsReturning.new + a.newVsReturning.returning);

  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.analytics'), at('adm.an.subtitle'), range),
    h('div', { class: 'adm-grid adm-grid--stats' },
      statCard({ label: 'DAU', value: fmtNumber(a.activeUsers.dau), hint: at('adm.an.dau'), iconName: 'user' }),
      statCard({ label: 'WAU', value: fmtNumber(a.activeUsers.wau), hint: at('adm.an.wau'), iconName: 'user' }),
      statCard({ label: 'MAU', value: fmtNumber(a.activeUsers.mau), hint: at('adm.an.mau'), iconName: 'user' }),
      statCard({ label: at('adm.an.neverActive'), value: fmtNumber(a.activeUsers.neverActive), hint: at('adm.an.neverHint'), iconName: 'clock' })),
    h('div', { class: 'adm-grid adm-grid--2' },
      card(at('adm.an.trend'), timeChart(ctx, { ariaLabel: at('adm.an.trend'), labels, datasets: [{ label: at('adm.an.creators'), data: a.series.map((p) => p.activeCreators), kind: 'line', color: '--positive' }, { label: at('adm.an.signups'), data: a.series.map((p) => p.signups), kind: 'bar', color: '--info' }] })),
      card(at('adm.an.txTrend'), timeChart(ctx, { ariaLabel: at('adm.an.txTrend'), labels, datasets: [{ label: at('adm.chart.txCreated'), data: a.series.map((p) => p.transactions), kind: 'bar', color: '--usd' }] }))),
    h('div', { class: 'adm-grid adm-grid--3' },
      card(at('adm.an.newReturning'), h('div', null,
        h('ul', { class: 'adm-bars reset-list' }, [[at('adm.an.new'), a.newVsReturning.new], [at('adm.an.returning'), a.newVsReturning.returning]].map(([label, n]) => h('li', null, h('div', { class: 'adm-bars__row' }, h('span', null, label), h('strong', null, fmtNumber(n))), h('div', { class: 'progress' }, h('div', { class: 'progress__fill', style: { width: `${Math.round((n / total) * 100)}%` } }))))),
        note(at('adm.an.newReturningNote')))),
      card(at('adm.an.features'), h('ul', { class: 'adm-kv reset-list' }, [['adm.user.transactions', a.features.transactions], ['adm.user.budgets', a.features.budgets], ['adm.user.goals', a.features.goals]].map(([k, v]) => h('li', null, h('span', null, at(k)), h('strong', null, fmtNumber(v)))))),
      card(at('adm.an.limits'), a.limitUsage.length ? h('ul', { class: 'adm-kv reset-list' }, a.limitUsage.map((l) => h('li', null, h('span', null, at('adm.an.limitRow', { feature: at(`adm.an.f.${l.feature}`), limit: l.limit, tariff: name(l.tariff) })), h('strong', null, fmtNumber(l.usersAtLimit))))) : note(at('adm.an.noLimits')))),
    card(at('adm.an.byTariff'), dataTable({ caption: at('adm.an.byTariff'), rows: a.byTariff, columns: [{ key: 'id', label: at('adm.col.plan'), render: (r) => name(r.id) }, { key: 'users', label: at('adm.an.users'), align: 'end', render: (r) => fmtNumber(r.users) }, { key: 'transactions', label: at('adm.an.txPeriod'), align: 'end', render: (r) => fmtNumber(r.transactions) }] }), { flush: true }),
    note(at('adm.an.unavailable'))
  );
}
