/**
 * components/layout/bottomNav.js
 * Mobile navigation: Home, Transactions, Statistics, Exchange, Profile.
 * Budgets, Goals and Categories live in the Profile ("more") hub.
 */

import { h } from '../../core/dom.js';
import { routes } from '../../core/navigation.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';

export function createBottomNav() {
  const links = routes
    .filter((route) => route.bottom)
    .map((route) =>
      h('a', { class: 'bottom-nav__link', href: `#${route.path}`, 'data-path': route.path }, icon(route.icon, { size: 22 }), h('span', null, t(route.bottom.labelKey)))
    );

  const element = h('nav', { class: 'bottom-nav', 'aria-label': t('app.mobileNavigation') }, links);

  return {
    element,
    setActive(path) {
      // Pages reached through the "more" hub keep the Profile tab highlighted.
      const hubPaths = ['/categories', '/budgets', '/goals', '/plans', '/telegram'];
      const activePath = hubPaths.includes(path) ? '/profile' : path;
      for (const link of links) {
        if (link.dataset.path === activePath) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
  };
}
