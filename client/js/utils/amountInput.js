/**
 * utils/amountInput.js
 * Live thousands separators for money inputs: typing 12500000 shows 12,500,000.
 * Only "." is a decimal separator; commas and spaces are ignored because we generate them.
 */

/** Sanitise raw text and add thousands separators. */
export function formatAmountText(text, maxDecimals = 2) {
  const cleaned = String(text).replace(/[^\d.]/g, '');
  const [wholeRaw = '', ...rest] = cleaned.split('.');
  const whole = wholeRaw.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (maxDecimals <= 0 || !cleaned.includes('.')) return whole;
  return `${whole || '0'}.${rest.join('').slice(0, maxDecimals)}`;
}

const significantCount = (text) => (text.match(/[\d.]/g) ?? []).length;

/**
 * Formats as the user types and keeps the caret next to the digit they just typed.
 * @param {HTMLInputElement} input
 * @param {() => number} getMaxDecimals  read on every keystroke (it depends on the selected currency)
 */
export function attachAmountFormatting(input, getMaxDecimals) {
  input.addEventListener('input', () => {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = significantCount(raw.slice(0, caret));
    const formatted = formatAmountText(raw, getMaxDecimals());
    if (formatted === raw) return;

    input.value = formatted;
    let position = 0;
    let seen = 0;
    while (position < formatted.length && seen < digitsBeforeCaret) {
      if (/[\d.]/.test(formatted[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  });
}
