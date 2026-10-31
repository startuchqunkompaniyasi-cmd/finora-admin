/**
 * components/emptyState.js
 * emptyState(): an invitation to act.   errorState(): what went wrong + how to retry.
 */

import { h } from '../core/dom.js';
import { icon } from '../utils/icons.js';
import { t } from '../i18n/index.js';

export function emptyState({ iconName = 'inbox', title, text, action } = {}) {
  return h(
    'div',
    { class: 'state' },
    h('span', { class: 'state__icon' }, icon(iconName, { size: 24 })),
    h('p', { class: 'state__title' }, title),
    text ? h('p', { class: 'state__text' }, text) : null,
    action ?? null
  );
}

export function errorState({ title, text, onRetry, retryLabel = t('common.retry') } = {}) {
  return h(
    'div',
    { class: 'state state--error', role: 'alert' },
    h('span', { class: 'state__icon' }, icon('alertCircle', { size: 24 })),
    h('p', { class: 'state__title' }, title),
    text ? h('p', { class: 'state__text' }, text) : null,
    onRetry ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: onRetry }, icon('refresh', { size: 16 }), retryLabel) : null
  );
}
