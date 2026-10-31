/**
 * components/avatar.js
 */

import { h } from '../core/dom.js';
import { icon } from '../utils/icons.js';
import { initials } from '../utils/format.js';

export function avatar({ name = '', src = '', size = 40 } = {}) {
  const label = initials(name);
  return h(
    'span',
    { class: 'avatar', style: { width: `${size}px`, height: `${size}px` }, 'aria-hidden': 'true' },
    src ? h('img', { src, alt: '', width: size, height: size }) : label || icon('user', { size: Math.round(size * 0.5) })
  );
}
