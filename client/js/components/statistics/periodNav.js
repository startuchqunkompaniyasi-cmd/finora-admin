/**
 * components/statistics/periodNav.js
 * [‹]  markaz (yorliq yoki tanlagichlar)  [›]  [Bugun]
 * Tugma cheklovga yetib "disabled" boʻlsa, fokus yoʻqolib ketmasligi uchun qarama-qarshi tugmaga oʻtadi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';

/**
 * @param {Object} o
 * @param {Node} o.center
 * @param {string} o.prevLabel / o.nextLabel   ekran oʻquvchi uchun nomlar
 * @param {()=>void} o.onPrev / o.onNext
 * @param {{label:string, onClick:()=>void}} [o.today]   "Shu hafta" kabi qaytish tugmasi
 */
export function periodNav({ center, prevLabel, nextLabel, onPrev, onNext, today }) {
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': prevLabel, onClick: onPrev }, icon('chevronLeft', { size: 18 }));
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': nextLabel, onClick: onNext }, icon('chevronRight', { size: 18 }));
  const todayButton = today ? h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: today.onClick }, today.label) : null;
  const element = h('div', { class: 'period-nav', role: 'group', 'aria-label': t('stats.periodNav'), tabindex: '-1' }, prev, center, next, todayButton);

  return {
    element,
    /** @param {{prevDisabled:boolean, nextDisabled:boolean, showToday?:boolean}} state */
    update({ prevDisabled, nextDisabled, showToday = false }) {
      const focused = document.activeElement;
      prev.disabled = prevDisabled;
      next.disabled = nextDisabled;
      if (todayButton) todayButton.hidden = !showToday;

      if (focused === prev && prevDisabled) (nextDisabled ? element : next).focus();
      else if (focused === next && nextDisabled) (prevDisabled ? element : prev).focus();
      else if (focused === todayButton && !showToday) element.focus();
    },
  };
}
