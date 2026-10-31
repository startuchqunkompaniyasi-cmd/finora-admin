/**
 * admin/components/bottomNav.js
 * Doimiy pastki navigatsiya (desktop va mobil): 5 asosiy boʻlim + "Yana" menyusi
 * (Analitika, Bildirishnomalar, Audit jurnali, Tizim holati, Admin profili).
 * Navigatsiya `position: fixed`, shuning uchun kontent ostiga `padding-bottom` qoʻyiladi (admin.css) —
 * jadval, forma va tugmalarni hech qachon yopmaydi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { at } from '../i18n.js';

const MAIN = [
  { path: '/admin/dashboard', icon: 'home', label: 'adm.nav.home', short: 'adm.nav.homeShort' },
  { path: '/admin/users', icon: 'user', label: 'adm.nav.users', short: 'adm.nav.usersShort', also: ['/admin/user'] },
  { path: '/admin/tariffs', icon: 'crown', label: 'adm.nav.tariffs', short: 'adm.nav.tariffs' },
  { path: '/admin/payments', icon: 'creditCard', label: 'adm.nav.payments', short: 'adm.nav.payments' },
  { path: '/admin/settings', icon: 'sliders', label: 'adm.nav.settings', short: 'adm.nav.settings' },
];

const MORE = [
  { path: '/admin/analytics', icon: 'barChart', label: 'adm.nav.analytics' },
  { path: '/admin/notifications', icon: 'bell', label: 'adm.nav.notifications' },
  { path: '/admin/audit', icon: 'clock', label: 'adm.nav.audit' },
  { path: '/admin/system', icon: 'checkCircle', label: 'adm.nav.system' },
  { path: '/admin/profile', icon: 'lock', label: 'adm.nav.profile' },
];

export function createAdminNav() {
  const links = MAIN.map((item) =>
    h('a', { class: 'adm-nav__link', href: `#${item.path}`, 'data-path': item.path, 'aria-label': at(item.label), title: at(item.label) }, icon(item.icon, { size: 22 }), h('span', { class: 'adm-nav__label' }, h('span', { class: 'adm-nav__full' }, at(item.label)), h('span', { class: 'adm-nav__short' }, at(item.short))))
  );

  const moreLinks = MORE.map((item) => h('a', { class: 'adm-more__item', href: `#${item.path}`, 'data-path': item.path, role: 'menuitem', onClick: () => closeMore() }, icon(item.icon, { size: 20 }), at(item.label)));
  const panel = h('div', { class: 'adm-more', id: 'adm-more', role: 'menu', 'aria-label': at('adm.nav.more'), hidden: true }, moreLinks);
  const moreButton = h('button', { class: 'adm-nav__link adm-nav__more', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'adm-more', onClick: () => (panel.hidden ? openMore() : closeMore()) }, icon('moreHorizontal', { size: 22 }), h('span', { class: 'adm-nav__label' }, at('adm.nav.more')));

  function openMore() {
    panel.hidden = false;
    moreButton.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    moreLinks[0].focus();
  }
  function closeMore({ restoreFocus = false } = {}) {
    panel.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    if (restoreFocus) moreButton.focus();
  }
  function onOutside(event) {
    if (!panel.contains(event.target) && !moreButton.contains(event.target)) closeMore();
  }
  function onKey(event) {
    if (event.key === 'Escape') closeMore({ restoreFocus: true });
  }

  const element = h('nav', { class: 'adm-nav', 'aria-label': at('adm.nav.label') }, h('div', { class: 'adm-nav__inner' }, links, moreButton), panel);

  return {
    element,
    setActive(path) {
      closeMore();
      let inMore = false;
      for (const link of links) {
        const item = MAIN.find((m) => m.path === link.dataset.path);
        const active = path === item.path || item.also?.includes(path);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      for (const link of moreLinks) {
        const active = link.dataset.path === path;
        inMore ||= active;
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      if (inMore) moreButton.setAttribute('data-active', 'true');
      else moreButton.removeAttribute('data-active');
    },
  };
}
