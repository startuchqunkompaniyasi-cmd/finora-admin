/**
 * components/layout/sidebar.js
 * Desktop: full sidebar. Tablet: icon rail (labels hidden with CSS, kept as aria-label/title).
 */

import { h } from '../../core/dom.js';
import { routes } from '../../core/navigation.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { brandLink } from '../brandLogo.js';

export function createSidebar() {
  const links = routes
    .filter((route) => route.sidebar)
    .map((route) => {
      const label = t(route.labelKey);
      return h(
        'a',
        { class: 'nav__link', href: `#${route.path}`, 'data-path': route.path, 'aria-label': label, title: label },
        icon(route.icon, { size: 20 }),
        h('span', { class: 'nav__label' }, label)
      );
    });

  const element = h(
    'aside',
    { class: 'sidebar' },
    brandLink(),
    h('nav', { class: 'nav', 'aria-label': t('app.mainNavigation') }, links),
    h('div', { class: 'sidebar__footer' }, h('p', { class: 'sidebar__slogan' }, t('app.slogan1'), h('span', null, t('app.slogan2'))))
  );

  return {
    element,
    setActive(path) {
      for (const link of links) {
        if (link.dataset.path === path) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
  };
}
