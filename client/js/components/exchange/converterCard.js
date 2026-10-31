/**
 * components/exchange/converterCard.js
 * Valyuta konverteri: summa, "dan/ga" va almashtirish tugmasi. Joriy kursdan foydalanadi
 * (services/exchangeService.getRate), 250ms kechikish bilan qayta hisoblaydi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';
import { CURRENCIES } from '../../../../shared/constants.js';
import { toMinor } from '../../../../shared/money.js';
import { formatMoney } from '../../utils/format.js';
import { attachAmountFormatting, formatAmountText } from '../../utils/amountInput.js';
import { getRate } from '../../services/exchangeService.js';

export function converterCard({ className = '' }) {
  let from = 'USD';
  let to = 'UZS';
  let debounceTimer;

  const amountInput = h('input', { class: 'input input--amount num', type: 'text', inputmode: 'decimal', 'aria-label': t('tx.amount'), placeholder: '0' });
  amountInput.value = '100';
  attachAmountFormatting(amountInput, () => CURRENCIES[from].decimals);

  const fromLabel = h('span', { class: 'converter__currency' }, from);
  const toLabel = h('span', { class: 'converter__currency' }, to);
  const resultValue = h('p', { class: 'converter__result-value num' }, '\u2014');
  const resultHint = h('p', { class: 'converter__hint' }, t('exchange.converterHint'));

  async function recalc() {
    const major = Number(amountInput.value.replace(/,/g, ''));
    if (!(major >= 0) || amountInput.value.trim() === '') {
      resultValue.textContent = '\u2014';
      return;
    }
    try {
      const { rate } = await getRate(from, to);
      resultValue.textContent = formatMoney(Math.round(toMinor(String(major)) * rate), to);
    } catch (error) {
      console.error('[finora] Konverter kursni olib boʻlmadi', error);
      resultValue.textContent = '\u2014';
    }
  }

  amountInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(recalc, 200);
  });

  const swapButton = h(
    'button',
    { class: 'icon-btn converter__swap', type: 'button', 'aria-label': t('exchange.swap') },
    icon('exchange', { size: 18 })
  );
  swapButton.addEventListener('click', () => {
    [from, to] = [to, from];
    fromLabel.textContent = from;
    toLabel.textContent = to;
    amountInput.value = formatAmountText(amountInput.value, CURRENCIES[from].decimals);
    recalc();
  });

  recalc();

  return h(
    'section',
    { class: ['card', className], 'aria-labelledby': 'converter-title' },
    h('h2', { class: 'card__title', id: 'converter-title' }, t('exchange.converterTitle')),
    h(
      'div',
      { class: 'converter' },
      h('div', { class: 'converter__field' }, fromLabel, amountInput),
      swapButton,
      h(
        'div',
        { class: 'converter__field converter__field--result' },
        toLabel,
        h('div', { class: 'converter__result' }, resultValue)
      )
    ),
    resultHint
  );
}
