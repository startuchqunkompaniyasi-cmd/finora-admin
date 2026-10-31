/**
 * components/progressBar.js
 * value is a 0..1 ratio. Bars animate from empty on first paint (transform only = cheap).
 * Budgets (phase 5) reuse this with tone colours for the 80% / 100% thresholds.
 */

import { h } from '../core/dom.js';

const TONES = { default: 'var(--focus)', positive: 'var(--positive)', warning: 'var(--warning-fill)', negative: 'var(--negative)' };

export function progressBar({ value, tone = 'default', color, label }) {
  const ratio = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
  const fill = h('div', { class: 'progress__fill', 'data-pending': '', style: { '--progress': String(ratio), '--progress-color': color ?? TONES[tone] } });

  requestAnimationFrame(() => requestAnimationFrame(() => fill.removeAttribute('data-pending')));

  return h(
    'div',
    { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(ratio * 100)), 'aria-label': label },
    fill
  );
}
