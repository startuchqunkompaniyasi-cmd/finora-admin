/**
 * components/skeleton.js
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';

/** skeleton({ width: '60%', height: 14 }) */
export function skeleton({ width = '100%', height = 16, radius, className = '' } = {}) {
  return h('span', {
    class: ['skeleton', className],
    'aria-hidden': 'true',
    style: {
      display: 'block',
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...(radius ? { borderRadius: radius } : {}),
    },
  });
}

/** Screen-reader friendly wrapper: bir marta "Yuklanmoqda" deb eʼlon qiladi instead of every block. */
export function loadingRegion(children, label = t('common.loading')) {
  return h('div', { role: 'status', 'aria-busy': 'true', 'aria-label': label }, children);
}
