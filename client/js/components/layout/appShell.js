/**
 * components/layout/appShell.js
 * Builds the persistent frame (sidebar, topbar, main outlet, bottom nav) once.
 * Pages render only into <main>, so navigation never rebuilds the chrome.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { createSidebar } from './sidebar.js';
import { createTopbar } from './topbar.js';
import { createBottomNav } from './bottomNav.js';

export function createAppShell({ onAddTransaction }) {
  const sidebar = createSidebar();
  const topbar = createTopbar({ onAddTransaction });
  const bottomNav = createBottomNav();
  const outlet = h('main', { class: 'main', id: 'main', tabindex: '-1' });

  const element = h(
    'div',
    { class: 'app' },
    sidebar.element,
    h('div', { class: 'app__body' }, topbar.element, outlet),
    bottomNav.element
  );

  return {
    element,
    outlet,
    skipLink: h('a', { class: 'skip-link', href: '#main', onClick: (event) => { event.preventDefault(); outlet.focus(); } }, t('app.skipToContent')),
    setActive(path) {
      sidebar.setActive(path);
      bottomNav.setActive(path);
    },
  };
}
