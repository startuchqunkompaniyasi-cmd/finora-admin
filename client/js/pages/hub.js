/**
 * pages/hub.js
 * "Profil va boshqalar". Yuqorida hisob holati (kirgan boʻlsa ism/email/chiqish, aks holda
 * kirish/roʻyxatdan oʻtish taklifi), keyin Kategoriyalar/Byudjetlar/Maqsadlar/Tariflar havolalari,
 * keyin koʻrinish (mavzu) sozlamasi.
 */

import { h } from '../core/dom.js';
import { store } from '../core/store.js';
import { getThemePreference, setThemePreference } from '../core/theme.js';
import { icon } from '../utils/icons.js';
import { initials, formatLongDay } from '../utils/format.js';
import { t } from '../i18n/index.js';
import { getSession, refreshSession, logout } from '../services/authService.js';
import { avatar } from '../components/avatar.js';
import { toast } from '../components/toast.js';

export const title = t('nav.profile');

const LINKS = [
  { path: '/categories', icon: 'layoutGrid', titleKey: 'nav.categories', hintKey: 'hub.categoriesHint' },
  { path: '/budgets', icon: 'wallet', titleKey: 'nav.budgets', hintKey: 'hub.budgetsHint' },
  { path: '/goals', icon: 'target', titleKey: 'nav.goals', hintKey: 'hub.goalsHint' },
  { path: '/telegram', icon: 'send', titleKey: 'tg.title', hintKey: 'hub.telegramHint' },
  { path: '/plans', icon: 'crown', titleKey: 'nav.plans', hintKey: 'hub.plansHint' },
];

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'theme.light', icon: 'sun' },
  { value: 'dark', labelKey: 'theme.dark', icon: 'moon' },
  { value: 'system', labelKey: 'theme.system', icon: 'refresh' },
];

function themeControl(ctx) {
  const group = h('div', { class: 'segmented', role: 'group', 'aria-label': t('hub.appearance') });

  const render = () => {
    const current = getThemePreference();
    group.replaceChildren(
      ...THEME_OPTIONS.map((option) =>
        h(
          'button',
          { class: 'segmented__option', type: 'button', 'aria-pressed': String(option.value === current), onClick: () => { setThemePreference(option.value); render(); } },
          icon(option.icon, { size: 16 }),
          t(option.labelKey)
        )
      )
    );
  };
  render();
  ctx.onCleanup(store.subscribe('theme', render));
  return group;
}

function accountCard(user, ctx) {
  if (user) {
    const signOut = h(
      'button',
      { class: 'btn btn--secondary btn--sm', type: 'button' },
      icon('x', { size: 14 }),
      t('hub.signOut')
    );
    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      try {
        await logout();
        toast.success(t('auth.loggedOut'));
        ctx.refresh();
      } catch (error) {
        console.error('[finora] Chiqish muvaffaqiyatsiz boʻldi', error);
        toast.error(error.message);
        signOut.disabled = false;
      }
    });

    return h(
      'section',
      { class: 'card account-card' },
      avatar({ name: user.name, size: 52 }),
      h(
        'div',
        { class: 'account-card__body' },
        h('p', { class: 'account-card__name' }, user.name),
        h('p', { class: 'account-card__email' }, user.email),
        h('p', { class: 'account-card__meta' }, t('hub.accountMember', { date: formatLongDay(user.createdAt.slice(0, 10)) }))
      ),
      signOut
    );
  }

  return h(
    'section',
    { class: 'card account-card account-card--guest' },
    h('span', { class: 'account-card__guest-icon' }, icon('user', { size: 24 })),
    h(
      'div',
      { class: 'account-card__body' },
      h('p', { class: 'account-card__name' }, t('hub.signIn')),
      h('p', { class: 'account-card__meta' }, t('hub.signInHint'))
    ),
    h('a', { class: 'btn btn--primary btn--sm', href: '#/login' }, t('hub.signIn'))
  );
}

export async function render(ctx) {
  const user = getSession() ?? (await refreshSession());

  return h(
    'div',
    null,
    h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('hub.title')), h('p', { class: 'page-header__subtitle' }, t('hub.subtitle')))),
    accountCard(user, ctx),
    h(
      'nav',
      { class: 'hub', 'aria-label': t('hub.title') },
      LINKS.map((link) =>
        h(
          'a',
          { class: 'hub__link', href: `#${link.path}` },
          h('span', { class: 'hub__icon' }, icon(link.icon, { size: 22 })),
          h('span', { class: 'hub__text' }, h('span', { class: 'hub__title', style: { display: 'block' } }, t(link.titleKey)), h('span', { class: 'hub__hint' }, t(link.hintKey))),
          h('span', { class: 'hub__chevron' }, icon('chevronRight', { size: 18 }))
        )
      )
    ),
    h('h2', { class: 'hub__section' }, t('hub.appearance')),
    themeControl(ctx),
    h('p', { class: 'hub__note' }, t('hub.profileNote'))
  );
}
