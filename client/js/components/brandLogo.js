/**
 * components/brandLogo.js
 * Finora mark: a navy tile with an "F" whose upper bar is green (money going up).
 */

import { h, s } from '../core/dom.js';
import { config } from '../core/config.js';
import { t } from '../i18n/index.js';
import { attachSecretTrigger, openAdminLogin } from '../admin/secretTrigger.js';

export function brandMark(size = 34) {
  return s(
    'svg',
    { class: 'brand__mark', width: size, height: size, viewBox: '0 0 34 34', 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { width: 34, height: 34, rx: 10, fill: '#0B1F3A' }),
    s('rect', { x: 0.5, y: 0.5, width: 33, height: 33, rx: 9.5, fill: 'none', stroke: 'rgba(255,255,255,0.14)' }),
    s('path', { d: 'M12 26V9', stroke: '#FFFFFF', 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' }),
    s('path', { d: 'M12 9.5h11', stroke: '#62E3A4', 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' }),
    s('path', { d: 'M12 17.5h7', stroke: '#FFFFFF', 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' })
  );
}

export function brandLink({ showName = true } = {}) {
  const link = h(
    'a',
    { class: 'brand', href: '#/dashboard', 'aria-label': t('brand.home') },
    brandMark(),
    showName ? h('span', { class: 'brand__name' }, config.appName) : null
  );
  // Yashirin kirish: logotip 5 marta ketma-ket bosilsa admin kirish oynasi ochiladi (xavfsizlik chegarasi emas).
  attachSecretTrigger(link, openAdminLogin);
  return link;
}
