/**
 * components/counterValue.js
 * A money value that counts up once when the page is shown.
 * Screen readers get the final value in a visually hidden node (the animated one is aria-hidden),
 * so they never hear the intermediate numbers.
 */

import { h } from '../core/dom.js';
import { formatMoney } from '../utils/format.js';
import { animateNumber } from '../utils/animate.js';

/**
 * @param {Object} options
 * @param {number} options.amount     minor units
 * @param {string} options.currency
 * @param {boolean} [options.sign]    prefix "+" for positive values
 * @param {{onMounted:Function, onCleanup:Function}} options.lifecycle  the page ctx
 */
export function counterValue({ amount, currency, sign = false, className = '', lifecycle }) {
  const format = (minor) => formatMoney(Math.round(minor), currency, { sign });
  const finalText = format(amount);
  const visual = h('span', { class: 'num', 'aria-hidden': 'true' }, finalText);

  lifecycle.onMounted(() => {
    const cancel = animateNumber({ to: amount, onFrame: (value) => { visual.textContent = format(value); } });
    lifecycle.onCleanup(cancel);
  });

  return h('span', { class: className }, visual, h('span', { class: 'sr-only' }, finalText));
}
