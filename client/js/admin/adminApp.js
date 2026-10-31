/**
 * admin/adminApp.js
 * Admin ilovasi: kirish oynasi YOKI (sessiya bor boʻlsa) pastki navigatsiyali boshqaruv paneli.
 * Oddiy FINORA ilovasidan butunlay alohida "qobiq": main.js `#/admin` manzillarida shu modulni
 * yuklaydi, va oddiy ilova bilan admin oʻrtasida oʻtishda sahifa qayta yuklanadi (holat aralashmaydi).
 *
 * Bu yerdagi "kirgan/kirmagan" tekshiruvi faqat interfeys uchun. Maʼlumot va amallarga ruxsatni
 * har doim SERVER beradi: sessiyasiz har bir /api/v1/admin soʻrovi 401 qaytaradi.
 */

import { h } from '../core/dom.js';
import { on } from '../core/events.js';
import { initTheme, toggleTheme } from '../core/theme.js';
import { store } from '../core/store.js';
import { createRouter } from '../core/router.js';
import { icon } from '../utils/icons.js';
import { brandMark } from '../components/brandLogo.js';
import { errorState } from '../components/emptyState.js';
import { at } from './i18n.js';
import { api, get } from './api.js';
import { createAdminNav } from './components/bottomNav.js';

const page = (name) => () => import(`./pages/${name}.js`);

export const ADMIN_ROUTES = [
  { path: '/admin/dashboard', title: at('adm.nav.home'), load: page('dashboard') },
  { path: '/admin/users', title: at('adm.nav.users'), load: page('users') },
  { path: '/admin/user', title: at('adm.nav.users'), load: page('userDetail') },
  { path: '/admin/tariffs', title: at('adm.nav.tariffs'), load: page('tariffs') },
  { path: '/admin/payments', title: at('adm.nav.payments'), load: page('payments') },
  { path: '/admin/settings', title: at('adm.nav.settings'), load: page('settings') },
  { path: '/admin/analytics', title: at('adm.nav.analytics'), load: page('analytics') },
  { path: '/admin/notifications', title: at('adm.nav.notifications'), load: page('notifications') },
  { path: '/admin/audit', title: at('adm.nav.audit'), load: page('audit') },
  { path: '/admin/system', title: at('adm.nav.system'), load: page('system') },
  { path: '/admin/profile', title: at('adm.nav.profile'), load: page('profile') },
];

const notFound = {
  path: '*',
  title: at('adm.notFound'),
  load: async () => ({ title: at('adm.notFound'), render: () => h('div', { class: 'adm-card' }, errorState({ title: at('adm.notFound'), text: at('adm.notFoundHint'), onRetry: () => { location.hash = '#/admin/dashboard'; }, retryLabel: at('adm.nav.home') })) }),
};

export async function bootAdmin(root) {
  initTheme();
  document.documentElement.classList.add('is-admin');

  let admin = null;
  try {
    admin = (await get('/auth/me'))?.admin ?? null; // 401 => sessiya yoʻq (bu GET CSRF cookie'sini ham oʻrnatadi)
  } catch (error) {
    if (error.status !== 401) {
      root.replaceChildren(h('div', { class: 'adm-center' }, h('div', { class: 'adm-card' }, errorState({ title: at('adm.loadFailed'), text: error.message, onRetry: () => location.reload() }))));
      return;
    }
  }

  if (!admin) {
    const { renderLogin } = await import('./pages/login.js');
    root.replaceChildren(renderLogin());
    return;
  }
  if (location.hash === '#/admin/login' || location.hash === '#/admin' || location.hash === '#/admin/') history.replaceState(null, '', '#/admin/dashboard');
  startPanel(root, admin);
}

async function logout() {
  try {
    await api('POST', '/auth/logout');
  } finally {
    location.hash = '#/admin/login';
    location.reload();
  }
}

function startPanel(root, admin) {
  // Sessiya tugasa yoki bekor qilinsa (boshqa qurilmada) kirish oynasiga qaytariladi.
  on('admin:unauthenticated', () => { location.hash = '#/admin/login'; location.reload(); });
  on('admin:password-required', () => { if (!location.hash.startsWith('#/admin/profile')) location.hash = '#/admin/profile?force=1'; });

  const themeButton = h('button', { class: 'icon-btn', type: 'button', onClick: toggleTheme });
  const syncTheme = () => {
    const dark = store.get('theme') === 'dark';
    themeButton.replaceChildren(icon(dark ? 'sun' : 'moon', { size: 18 }));
    themeButton.setAttribute('aria-label', dark ? at('adm.themeLight') : at('adm.themeDark'));
  };
  store.subscribe('theme', syncTheme);
  syncTheme();

  const nav = createAdminNav();
  const outlet = h('main', { class: 'adm-main', id: 'adm-main', tabindex: '-1' });
  const warning = admin.mustChangePassword
    ? h('div', { class: 'adm-banner', role: 'status' }, icon('alertTriangle', { size: 16 }), h('span', null, at('adm.mustChange')), h('a', { href: '#/admin/profile' }, at('adm.changeNow')))
    : null;

  const skip = h('a', { class: 'skip-link', href: '#adm-main', onClick: (event) => { event.preventDefault(); outlet.focus(); } }, at('adm.skip'));

  root.replaceChildren(
    skip,
    h(
      'div',
      { class: 'adm' },
      h('header', { class: 'adm-top' },
        h('a', { class: 'adm-top__brand', href: '#/admin/dashboard', 'aria-label': at('adm.nav.home') }, brandMark(30), h('span', null, h('strong', null, 'Finora'), h('em', null, at('adm.panel')))),
        h('div', { class: 'adm-top__actions' },
          h('span', { class: 'adm-top__user' }, icon('user', { size: 16 }), admin.username),
          themeButton,
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': at('adm.logout'), title: at('adm.logout'), onClick: logout }, icon('arrowRight', { size: 18 })))),
      warning,
      outlet,
      nav.element
    )
  );

  const router = createRouter({
    routes: ADMIN_ROUTES,
    outlet,
    notFound,
    defaultPath: '/admin/dashboard',
    onNavigate: ({ path }) => nav.setActive(path),
  });
  router.start();
}
