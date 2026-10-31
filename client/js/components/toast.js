/**
 * components/toast.js
 * toast.success('Transaction added successfully.')
 * toast.error('Please enter a valid amount.')
 * toast.warning('You have reached 80% of your Food budget.')
 *
 * Messages are inserted as text nodes (never HTML). Errors use role="alert" so screen
 * readers interrupt; everything else is polite.
 */

import { h } from '../core/dom.js';
import { icon } from '../utils/icons.js';
import { t } from '../i18n/index.js';

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = { success: 4000, info: 4500, warning: 6500, error: 6500 };
const ICONS = { success: 'checkCircle', error: 'alertCircle', warning: 'alertTriangle', info: 'info' };

let region;

function getRegion() {
  if (!region || !region.isConnected) {
    region = h('div', { class: 'toast-region', role: 'region', 'aria-label': t('toast.region') });
    document.body.append(region);
  }
  return region;
}

function dismiss(node) {
  if (node.dataset.state === 'leaving') return;
  node.dataset.state = 'leaving';
  const remove = () => node.remove();
  node.addEventListener('animationend', remove, { once: true });
  setTimeout(remove, 400); // safety net when animations are disabled
}

function show(type, message, { duration = DEFAULT_DURATION[type] } = {}) {
  const container = getRegion();
  while (container.children.length >= MAX_VISIBLE) container.firstElementChild.remove();

  const node = h(
    'div',
    { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' },
    h('span', { class: 'toast__icon' }, icon(ICONS[type], { size: 16 })),
    h('p', { class: 'toast__message' }, message),
    h('button', { class: 'toast__close', type: 'button', 'aria-label': t('common.close'), onClick: () => dismiss(node) }, icon('x', { size: 16 }))
  );
  container.append(node);

  let timer = setTimeout(() => dismiss(node), duration);
  const pause = () => clearTimeout(timer);
  const resume = () => {
    timer = setTimeout(() => dismiss(node), 2000);
  };
  node.addEventListener('mouseenter', pause);
  node.addEventListener('mouseleave', resume);
  node.addEventListener('focusin', pause);
  node.addEventListener('focusout', resume);

  return () => dismiss(node);
}

export const toast = {
  success: (message, options) => show('success', message, options),
  error: (message, options) => show('error', message, options),
  warning: (message, options) => show('warning', message, options),
  info: (message, options) => show('info', message, options),
};
