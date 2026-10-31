/**
 * shared/money.js
 * Money is stored as INTEGER minor units (amount x 100) to avoid float drift
 * (0.1 + 0.2 !== 0.3). Every currency uses the same x100 scale so conversion
 * between currencies is a single multiplication.
 */

export const MINOR_UNIT = 100;

/**
 * Parse user input ("1 250 000", "1,250.50", 1250.5) into minor units.
 * Returns NaN for anything that is not a non-negative amount with max 2 decimals.
 */
export function toMinor(input) {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? Math.round(input * MINOR_UNIT) : NaN;
  }
  if (typeof input !== 'string') return NaN;

  const cleaned = input.replace(/[\s,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;

  // Split instead of parseFloat so "0.29" never becomes 28.999999.
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * MINOR_UNIT + Number(fraction.padEnd(2, '0'));
}

export function fromMinor(minor) {
  return minor / MINOR_UNIT;
}

/** Convert minor units of one currency to minor units of another using `rate` (target per 1 source). */
export function convertMinor(minor, rate) {
  return Math.round(minor * rate);
}

let warnedAboutMissingRate = false;

/**
 * Amount of a transaction expressed in the user's base currency (minor units).
 * `fxRateToBase` = how much base currency 1 unit of the transaction currency was worth
 * WHEN the transaction was created, so historical reports do not change when rates move.
 */
export function toBaseMinor(transaction, baseCurrency) {
  if (transaction.currency === baseCurrency) return transaction.amount;

  const rate = Number(transaction.fxRateToBase);
  if (!(rate > 0)) {
    if (!warnedAboutMissingRate) {
      warnedAboutMissingRate = true;
      console.warn(
        `[finora] Transaction ${transaction.id} is in ${transaction.currency} but has no valid fxRateToBase; ` +
          'it is excluded from totals.'
      );
    }
    return 0;
  }
  return convertMinor(transaction.amount, rate);
}
