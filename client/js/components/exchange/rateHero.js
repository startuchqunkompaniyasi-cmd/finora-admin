/**
 * components/exchange/rateHero.js
 * Valyuta kursi sahifasining bosh qismi: katta kurs, oʻzgarish, manba va yangilangan vaqt.
 * Yuklanish/xato holatlari bosh sahifadagi rateCard bilan bir xil uslubda, lekin batafsilroq.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { config } from '../../core/config.js';
import { formatLongDay, formatPercent, formatRate, formatTime } from '../../utils/format.js';
import { errorState } from '../emptyState.js';
import { skeleton } from '../skeleton.js';

const SOURCE_LABELS = { cbu: 'exchange.sourceCbu', secondary: 'exchange.sourceSecondary', demo: 'exchange.sourceDemo' };

function loadingBlock() {
  return h(
    'div',
    { role: 'status', 'aria-label': t('rate.loading'), class: 'rate-hero__loading' },
    skeleton({ width: 160, height: 44 }),
    skeleton({ width: 220, height: 20 }),
    skeleton({ width: 180, height: 16 })
  );
}

function snapshotBlock(snapshot) {
  const isUp = snapshot.change >= 0;
  const sign = isUp ? '+' : '\u2212';

  return h(
    'div',
    { class: 'rate-hero' },
    h('p', { class: 'rate-hero__pair' }, icon('exchange', { size: 18 }), t('exchange.pair')),
    h('p', { class: 'rate-hero__value num' }, `${formatRate(snapshot.rate)} UZS`),
    h(
      'div',
      { class: 'rate-hero__change' },
      h('span', { class: ['badge', isUp ? 'badge--positive' : 'badge--negative', 'num'] }, icon(isUp ? 'trendingUp' : 'trendingDown', { size: 14 }), `${sign}${formatRate(Math.abs(snapshot.change))} UZS`),
      h('span', { class: ['num', isUp ? 'is-positive' : 'is-negative'] }, formatPercent(snapshot.changePct, { sign: true, digits: 2 })),
      h('span', { class: 'rate-hero__prev num' }, `${t('exchange.asOf', { date: formatLongDay(snapshot.dayKey) })}`)
    ),
    h(
      'div',
      { class: 'rate-hero__meta' },
      h('span', { class: 'rate-hero__updated' }, icon('clock', { size: 14 }), t('rate.updated', { time: formatTime(snapshot.updatedAt, config.timezone) })),
      h('span', { class: 'rate-hero__source' }, t('exchange.sourceLabel', { source: t(SOURCE_LABELS[snapshot.source] ?? 'exchange.sourceDemo') })),
      snapshot.demo ? h('span', { class: 'badge badge--warning' }, t('rate.demo')) : null,
      snapshot.stale ? h('span', { class: 'badge badge--warning' }, t('rate.outdated')) : null
    ),
    snapshot.demo ? h('p', { class: 'rate-hero__notice' }, icon('info', { size: 14 }), t('exchange.demoNotice')) : null,
    snapshot.stale ? h('p', { class: 'rate-hero__notice' }, icon('alertTriangle', { size: 14 }), t('exchange.staleNotice')) : null
  );
}

export function rateHero({ snapshotPromise, className = '' }) {
  const body = h('div', null, loadingBlock());

  function load(promise) {
    body.replaceChildren(loadingBlock());
    promise.then(
      (snapshot) => body.replaceChildren(snapshotBlock(snapshot)),
      (error) => {
        console.error('[finora] Kurs sahifasini yuklab boʻlmadi:', error);
        body.replaceChildren(errorState({ title: t('rate.loadFailed'), text: t('rate.loadFailedHint') }));
      }
    );
  }
  load(snapshotPromise);

  return h('section', { class: ['card', 'rate-hero-card', className], 'aria-label': t('exchange.pair') }, body);
}
