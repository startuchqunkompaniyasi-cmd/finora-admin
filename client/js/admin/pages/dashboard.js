/**
 * admin/pages/dashboard.js
 * Bosh sahifa: jonli statistika (serverdan), oraliq filtri, grafiklar, soʻnggi harakatlar.
 * Hech qanday statistika toʻqib chiqarilmaydi: maʼlumot yoʻq boʻlsa — "mavjud emas" yoki boʻsh holat.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { at } from '../i18n.js';
import { get } from '../api.js';
import { fmtDateTime, fmtNumber, fmtMoney, fmtBytes, fmtDuration, fmtAgo, todayKey, addDaysKey } from '../format.js';
import { pageHeader, card, statCard, badge, dataTable, emptyBlock, note, actionLabel } from '../components/ui.js';
import { timeChart, shortDay } from '../components/charts.js';

export const title = at('adm.nav.home');

export async function render(ctx) {
  const to = ctx.query.get('to') || todayKey();
  const from = ctx.query.get('from') || addDaysKey(to, -29);
  const [data, tariffData] = await Promise.all([get('/dashboard', { from, to }), get('/tariffs')]);
  const tariffs = tariffData.tariffs;
  const tariffName = (id) => tariffs.find((x) => x.id === id)?.name ?? id;

  // ---- filtr paneli ----
  const fromInput = h('input', { class: 'input', type: 'date', value: from, max: to, 'aria-label': at('adm.from') });
  const toInput = h('input', { class: 'input', type: 'date', value: to, max: todayKey(), 'aria-label': at('adm.to') });
  const apply = () => { if (fromInput.value && toInput.value) { ctx.setQuery({ from: fromInput.value, to: toInput.value }); ctx.refresh(); } };
  const preset = (days) => () => { ctx.setQuery({ from: addDaysKey(todayKey(), -(days - 1)), to: todayKey() }); ctx.refresh(); };
  const filters = h('div', { class: 'adm-filters' },
    h('div', { class: 'adm-presets', role: 'group', 'aria-label': at('adm.range') }, [7, 30, 90].map((d) => h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: preset(d) }, at('adm.lastDays', { n: d })))),
    h('label', { class: 'adm-filters__date' }, h('span', null, at('adm.from')), fromInput),
    h('label', { class: 'adm-filters__date' }, h('span', null, at('adm.to')), toInput),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: apply }, at('adm.apply')),
    h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => ctx.refresh() }, icon('refresh', { size: 16 }), at('adm.refresh'))
  );

  const u = data.users;
  const stats = h('div', { class: 'adm-grid adm-grid--stats' },
    statCard({ label: at('adm.stat.totalUsers'), value: fmtNumber(u.total), hint: at('adm.stat.suspended', { n: u.suspended }), iconName: 'user' }),
    statCard({ label: at('adm.stat.activeUsers'), value: fmtNumber(u.active30d), hint: at('adm.stat.active30'), iconName: 'trendingUp', tone: 'positive' }),
    statCard({ label: at('adm.stat.newToday'), value: fmtNumber(u.newToday), hint: at('adm.stat.newWeekMonth', { w: u.newWeek, m: u.newMonth }), iconName: 'sparkles' }),
    statCard({ label: at('adm.stat.transactions'), value: fmtNumber(data.transactions.total), hint: at('adm.stat.txRange', { n: data.transactions.inRange }), iconName: 'creditCard' }),
    statCard({ label: at('adm.stat.revenue'), unavailable: true, hint: at('adm.stat.noBilling'), iconName: 'wallet' }),
    statCard({ label: at('adm.stat.outstanding'), unavailable: true, hint: at('adm.stat.noBilling'), iconName: 'clock' })
  );

  // ---- grafiklar ----
  const labels = data.series.map((p) => shortDay(p.day));
  const growth = card(at('adm.chart.growth'), timeChart(ctx, {
    ariaLabel: at('adm.chart.growth'),
    labels,
    secondAxis: true,
    datasets: [
      { label: at('adm.chart.newUsers'), data: data.series.map((p) => p.newUsers), kind: 'bar', color: '--info', yAxisID: 'y1' },
      { label: at('adm.chart.totalUsers'), data: data.series.map((p) => p.totalUsers), kind: 'line', color: '--positive' },
    ],
  }));
  const activity = card(at('adm.chart.activity'), timeChart(ctx, {
    ariaLabel: at('adm.chart.activity'),
    labels,
    datasets: [{ label: at('adm.chart.txCreated'), data: data.series.map((p) => p.transactions), kind: 'bar', color: '--usd' }],
  }));

  // ---- tarif taqsimoti ----
  const totalUsers = Math.max(1, u.total);
  const distribution = card(at('adm.tariffDist'), data.tariffDistribution.length
    ? h('ul', { class: 'adm-bars reset-list' }, data.tariffDistribution.map((row) => h('li', null, h('div', { class: 'adm-bars__row' }, h('span', null, tariffName(row.id)), h('strong', null, fmtNumber(row.users))), h('div', { class: 'progress' }, h('div', { class: 'progress__fill', style: { width: `${Math.round((row.users / totalUsers) * 100)}%` } })))))
    : emptyBlock(at('adm.noUsersYet')));

  // ---- soʻnggi harakatlar ----
  const recentUsers = card(at('adm.recentUsers'), dataTable({
    caption: at('adm.recentUsers'),
    empty: at('adm.noUsersYet'),
    rows: data.recentUsers,
    columns: [
      { key: 'name', label: at('adm.col.name'), render: (r) => h('a', { href: `#/admin/user?id=${encodeURIComponent(r.id)}`, class: 'adm-link' }, r.name) },
      { key: 'plan', label: at('adm.col.plan'), render: (r) => badge(tariffName(r.plan)) },
      { key: 'createdAt', label: at('adm.col.registered'), render: (r) => fmtAgo(r.createdAt) },
    ],
  }), { flush: true });

  const recentTx = card(at('adm.recentTx'), dataTable({
    caption: at('adm.recentTx'),
    empty: at('adm.noTxYet'),
    rows: data.recentTransactions,
    columns: [
      { key: 'userName', label: at('adm.col.user'), render: (r) => h('a', { href: `#/admin/user?id=${encodeURIComponent(r.userId)}`, class: 'adm-link' }, r.userName) },
      { key: 'type', label: at('adm.col.type'), render: (r) => badge(at(`adm.type.${r.type}`), r.type === 'income' ? 'positive' : 'negative') },
      { key: 'amount', label: at('adm.col.amount'), align: 'end', render: (r) => fmtMoney(r.amount, r.currency) },
    ],
  }), { flush: true });

  const recentAudit = card(at('adm.recentAudit'), data.recentAudit.length
    ? h('ul', { class: 'adm-feed reset-list' }, data.recentAudit.map((e) => h('li', null, h('span', { class: 'adm-feed__main' }, h('strong', null, actionLabel(e.action)), ' · ', e.adminUsername), h('span', { class: 'adm-feed__time' }, fmtAgo(e.createdAt)))))
    : emptyBlock(at('adm.noAudit')), { actions: h('a', { class: 'adm-link', href: '#/admin/audit' }, at('adm.all')) });

  const sys = data.system;
  const health = card(at('adm.health'), h('ul', { class: 'adm-kv reset-list' },
    h('li', null, h('span', null, at('adm.health.db')), badge(sys.dbOk ? at('adm.ok') : at('adm.bad'), sys.dbOk ? 'positive' : 'negative')),
    h('li', null, h('span', null, at('adm.health.dbSize')), h('strong', null, fmtBytes(sys.dbSizeBytes))),
    h('li', null, h('span', null, at('adm.health.migrations')), h('strong', null, `${sys.migrations}`))
  ), { actions: h('a', { class: 'adm-link', href: '#/admin/system' }, at('adm.details')) });

  const volume = card(at('adm.volume'), data.volume.length
    ? h('ul', { class: 'adm-kv reset-list' }, data.volume.map((v) => h('li', null, h('span', null, `${at(`adm.type.${v.type}`)} · ${v.currency}`), h('strong', null, fmtMoney(v.sumMinor, v.currency)))))
    : emptyBlock(at('adm.noTxRange')));

  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.home'), at('adm.dash.subtitle')),
    filters,
    stats,
    h('div', { class: 'adm-grid adm-grid--2' }, growth, activity),
    h('div', { class: 'adm-grid adm-grid--3' }, distribution, volume, health),
    h('div', { class: 'adm-grid adm-grid--2' }, recentUsers, recentTx),
    recentAudit,
    note(at('adm.dash.volumeNote'))
  );
}
