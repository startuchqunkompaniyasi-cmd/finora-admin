/**
 * components/dashboard/rateCard.js
 * USD / UZS widget. Loads independently of the rest of the dashboard: skeleton while
 * loading, clear error + retry on failure, and honest "Demo data" / "Outdated" badges.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { config } from '../../core/config.js';
import { formatPercent, formatRate, formatTime } from '../../utils/format.js';
import { getUsdUzsSnapshot } from '../../services/exchangeService.js';
import { errorState } from '../emptyState.js';
import { skeleton } from '../skeleton.js';
import { sparkline } from '../sparkline.js';

function loadingBlock() {
  return h(
    'div',
    { role: 'status', 'aria-label': t('rate.loading'), style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' } },
    skeleton({ width: '60%', height: 30 }),
    skeleton({ width: '40%', height: 16 }),
    skeleton({ height: 64 })
  );
}

function snapshotBlock(snapshot) {
  const isUp = snapshot.change >= 0;
  const sign = isUp ? '+' : '\u2212';

  return h(
    'div',
    { class: 'rate' },
    h(
      'div',
      null,
      h('p', { class: 'rate__value num' }, `${formatRate(snapshot.rate)} UZS`),
      h(
        'div',
        { class: 'rate__change' },
        h('span', { class: [isUp ? 'is-positive' : 'is-negative', 'num'] }, `${sign}${formatRate(Math.abs(snapshot.change))} UZS`),
        h('span', { class: ['badge', isUp ? 'badge--positive' : 'badge--negative', 'num'] }, icon(isUp ? 'trendingUp' : 'trendingDown', { size: 12 }), formatPercent(snapshot.changePct, { sign: true, digits: 2 }))
      )
    ),
    h('div', { class: 'rate__trend' }, sparkline({ values: snapshot.history.map((point) => point.rate), ariaLabel: t('rate.trendLabel') })),
    h(
      'div',
      { class: 'rate__footer' },
      h('span', { class: 'rate__updated' }, icon('clock', { size: 14 }), t('rate.updated', { time: formatTime(snapshot.updatedAt, config.timezone) })),
      snapshot.demo ? h('span', { class: 'badge badge--warning' }, t('rate.demo')) : null,
      snapshot.stale ? h('span', { class: 'badge badge--warning' }, t('rate.outdated')) : null
    )
  );
}

export function rateCard({ ratePromise, className = '' }) {
  const body = h('div', null, loadingBlock());

  function load(promise) {
    body.replaceChildren(loadingBlock());
    promise.then(
      (snapshot) => body.replaceChildren(snapshotBlock(snapshot)),
      (error) => {
        console.error('[finora] Unable to load exchange rate:', error);
        body.replaceChildren(errorState({ title: t('rate.loadFailed'), text: t('rate.loadFailedHint'), onRetry: () => load(getUsdUzsSnapshot()) }));
      }
    );
  }
  load(ratePromise);

  return h(
    'section',
    { class: ['card', className], 'aria-labelledby': 'rate-title' },
    h(
      'div',
      { class: 'card__header' },
      h('div', { class: 'rate__pair' }, h('span', { class: 'rate__chip', 'aria-hidden': 'true' }, '$'), h('h2', { class: 'card__title', id: 'rate-title' }, t('rate.title'))),
      h('a', { class: 'card__link', href: '#/exchange' }, t('nav.exchange'), icon('chevronRight', { size: 16 }))
    ),
    body
  );
}
