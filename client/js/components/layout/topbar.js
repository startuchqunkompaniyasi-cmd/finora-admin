/**
 * components/layout/topbar.js
 * Brand (mobile only), theme toggle, notifications, avatar menu, "Add transaction".
 */

import { h } from '../../core/dom.js';
import { store } from '../../core/store.js';
import { toggleTheme } from '../../core/theme.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { brandLink } from '../brandLogo.js';
import { avatar } from '../avatar.js';
import { createDropdown } from '../dropdown.js';
import { emptyState } from '../emptyState.js';

export function createTopbar({ onAddTransaction }) {
  // Theme toggle: icon and label always describe what the click will do.
  const themeButton = h('button', { class: 'icon-btn', type: 'button', onClick: toggleTheme });
  const renderThemeButton = (theme) => {
    const goingDark = theme !== 'dark';
    themeButton.replaceChildren(icon(goingDark ? 'moon' : 'sun', { size: 18 }));
    themeButton.setAttribute('aria-label', t(goingDark ? 'topbar.switchToDark' : 'topbar.switchToLight'));
  };
  renderThemeButton(store.get('theme'));
  store.subscribe('theme', renderThemeButton);

  // Notifications: empty for now. Budget alerts (phase 5) will populate this panel.
  const notifications = createDropdown({
    label: t('topbar.notifications'),
    triggerContent: icon('bell', { size: 18 }),
    renderPanel: () =>
      emptyState({ iconName: 'bell', title: t('topbar.allCaughtUp'), text: t('topbar.notificationsHint') }),
  });

  const profileMenu = createDropdown({
    label: t('topbar.profileMenu'),
    triggerClass: 'avatar-btn',
    triggerContent: avatar({ name: store.get('session')?.name ?? store.get('profile')?.name }),
    renderPanel: ({ close }) =>
      h(
        'div',
        null,
        h(
          'div',
          { class: 'menu__header' },
          h('p', { class: 'menu__title' }, store.get('session')?.name || store.get('profile')?.name || t('topbar.localProfile')),
          h('p', { class: 'menu__text' }, store.get('session')?.email ?? t('topbar.localProfileHint'))
        ),
        h('div', { class: 'menu__divider' }),
        h('a', { class: 'menu__item', href: '#/profile', onClick: close }, icon('user', { size: 18 }), t('topbar.profileAndMore'))
      ),
  });

  // Sessiya (kirish holati) oʻzgarsa, profil tugmasidagi avatar/ism yangilanishi uchun dropdown'ni qayta quramiz.
  store.subscribe('session', () => {
    profileMenu.trigger.replaceChildren(avatar({ name: store.get('session')?.name ?? store.get('profile')?.name }));
  });

  const addButton = h(
    'button',
    { class: 'btn btn--primary', type: 'button', 'aria-label': t('topbar.addTransaction'), onClick: onAddTransaction },
    icon('plus', { size: 18 }),
    h('span', { class: 'topbar__add-label' }, t('topbar.addTransaction'))
  );

  const element = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'topbar__lead' }, brandLink()),
    h('div', { class: 'topbar__actions' }, themeButton, notifications.root, profileMenu.root, addButton)
  );

  return { element };
}
