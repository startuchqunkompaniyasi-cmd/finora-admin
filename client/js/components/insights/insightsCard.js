/**
 * components/insights/insightsCard.js
 * Aqlli tahlillar roʻyxati. Har doim izoh bilan: bu statistik xulosa, maslahat emas.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { emptyState } from '../emptyState.js';

/**
 * @param {{id:string, tone:string, iconName:string, text:string}[]} insights   describeInsights() natijasi
 * @param {string} [o.linkHref]   "Barchasi" havolasi (bosh sahifada)
 * @param {boolean} [o.showEmpty] tahlil boʻlmaganda boʻsh holatni koʻrsatish
 */
export function insightsCard({ insights, linkHref, showEmpty = false, className = '' }) {
  if (insights.length === 0 && !showEmpty) return null;

  return h(
    'section',
    { class: ['card', 'insights', className], 'aria-labelledby': 'insights-title' },
    h(
      'div',
      { class: 'card__header' },
      h('div', { class: 'insights__heading' }, icon('lightbulb', { size: 20, class: 'insights__mark' }), h('h2', { class: 'card__title', id: 'insights-title' }, t('insights.title'))),
      linkHref ? h('a', { class: 'card__link', href: linkHref }, t('dashboard.viewAll'), icon('chevronRight', { size: 16 })) : null
    ),
    insights.length === 0
      ? emptyState({ iconName: 'lightbulb', title: t('insights.empty') })
      : h(
          'ul',
          { class: 'insights__list reset-list' },
          insights.map((insight) => h('li', { class: ['insight', `insight--${insight.tone}`] }, h('span', { class: 'insight__chip' }, icon(insight.iconName, { size: 18 })), h('p', { class: 'insight__text' }, insight.text)))
        ),
    h('p', { class: 'insights__disclaimer' }, t('insights.disclaimer'))
  );
}
