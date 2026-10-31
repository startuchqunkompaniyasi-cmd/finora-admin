/**
 * pages/plans.js
 * Free / Premium / Mega Premium comparison, rendered from shared/plans.js.
 * Read-only for now: no prices and no upgrade flow until accounts + billing exist (phase 7B).
 */

import { h } from '../core/dom.js';
import { store } from '../core/store.js';
import { icon } from '../utils/icons.js';
import { formatMoney } from '../utils/format.js';
import { t } from '../i18n/index.js';
import { PLANS } from '../../../shared/plans.js';
import { DEFAULT_PLAN } from '../../../shared/plans.js';
import { getPlanId } from '../services/entitlements.js';
import { fetchTariffs } from '../services/tariffsService.js';
import { refreshSession } from '../services/authService.js';

export const title = t('nav.plans');

/** Narx matni: bazadagi narx > 0 boʻlsa pul + davr; 0 boʻlsa "Bepul" (free) yoki "narx tez orada" (boshqalar). */
function priceText(tariff) {
  if (tariff.priceMinor > 0) return `${formatMoney(tariff.priceMinor, 'UZS')} / ${t(`plans.period.${tariff.billingPeriod}`)}`;
  return tariff.id === 'free' ? t('plans.free') : t('plans.pricing');
}

/** Cheklov qatorlari (byudjet/maqsad soni). `null` yoki yoʻq = cheksiz. */
function limitLines(tariff) {
  const limits = tariff.limits ?? {};
  return ['budgets', 'goals'].map((key) => (Number.isInteger(limits[key]) ? t(`plans.limit.${key}`, { count: limits[key] }) : t(`plans.limit.${key}Unlimited`)));
}

function planCard(tariff, currentId, nameOf) {
  const isCurrent = tariff.id === currentId;
  const headingId = `plan-${tariff.id}`;
  const builtin = PLANS[tariff.id];
  const parent = builtin?.inherits ? nameOf(builtin.inherits) : null;

  return h(
    'article',
    { class: ['plan', 'card', `plan--${tariff.id}`, isCurrent && 'is-current'], 'aria-labelledby': headingId },
    h(
      'header',
      { class: 'plan__header' },
      h('div', { class: 'plan__title-row' }, tariff.id !== 'free' ? icon(tariff.id === 'mega' ? 'crown' : 'sparkles', { size: 20, class: 'plan__mark' }) : null, h('h2', { class: 'plan__name', id: headingId }, tariff.name), isCurrent ? h('span', { class: 'badge badge--positive' }, t('plans.current')) : null),
      tariff.description ? h('p', { class: 'plan__tagline' }, tariff.description) : null,
      h('p', { class: 'plan__price' }, priceText(tariff)),
      tariff.trialDays > 0 ? h('p', { class: 'plan__tagline' }, t('plans.trial', { days: tariff.trialDays })) : null
    ),
    parent ? h('p', { class: 'plan__includes' }, t('plans.includes', { plan: parent })) : null,
    h(
      'ul',
      { class: 'plan__features reset-list' },
      limitLines(tariff).map((line) => h('li', { class: 'plan__feature' }, icon('check', { size: 18, class: 'plan__check' }), h('span', null, line))),
      (builtin?.features ?? []).map((feature) =>
        h('li', { class: 'plan__feature' }, icon('check', { size: 18, class: 'plan__check' }), h('span', null, feature.label), feature.status === 'planned' ? h('span', { class: 'badge plan__badge' }, t('plans.planned')) : null)
      )
    ),
    h('button', { class: ['btn', isCurrent ? 'btn--secondary' : 'btn--primary'], type: 'button', disabled: true }, isCurrent ? t('plans.yourPlan') : t('plans.comingSoon'))
  );
}

export async function render() {
  // Sessiya fonda tekshiriladi; joriy tarif serverdan (admin oʻzgartirgan boʻlishi mumkin) olinishi uchun kutamiz.
  if (store.get('session') === undefined) await refreshSession();
  const [{ tariffs, currentPlan }, localPlan] = await Promise.all([fetchTariffs(), getPlanId()]);
  const currentId = currentPlan ?? localPlan ?? DEFAULT_PLAN;
  const names = Object.fromEntries(tariffs.map((tariff) => [tariff.id, tariff.name]));
  const nameOf = (id) => names[id] ?? PLANS[id]?.name ?? id;

  return h(
    'div',
    null,
    h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('plans.title')), h('p', { class: 'page-header__subtitle' }, t('plans.subtitle')))),
    h('div', { class: 'plans' }, tariffs.map((tariff) => planCard(tariff, currentId, nameOf))),
    h('p', { class: 'plans__note' }, icon('info', { size: 16 }), t('plans.note'))
  );
}
