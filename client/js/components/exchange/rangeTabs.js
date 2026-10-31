/**
 * components/exchange/rangeTabs.js
 * 1K / 7K / 1O / 3O / 6O / 1Y davr tugmalari. Haqiqiy radio inputlar emas, oddiy tugmalar
 * (segmented uslub bilan), chunki bu forma emas, koʻrinishni almashtiruvchi filtr.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { HISTORY_RANGES } from '../../services/exchangeService.js';

const LABEL_KEYS = { '1D': 'exchange.range1D', '7D': 'exchange.range7D', '1M': 'exchange.range1M', '3M': 'exchange.range3M', '6M': 'exchange.range6M', '1Y': 'exchange.range1Y' };

export function rangeTabs({ value, onChange }) {
  const buttons = new Map();

  const element = h(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': t('exchange.rangeLabel') },
    HISTORY_RANGES.map((range) => {
      const button = h('button', { class: 'segmented__option', type: 'button', 'aria-pressed': String(range === value), onClick: () => onChange(range) }, t(LABEL_KEYS[range]));
      buttons.set(range, button);
      return button;
    })
  );

  return {
    element,
    setValue(range) {
      for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === range));
    },
  };
}
