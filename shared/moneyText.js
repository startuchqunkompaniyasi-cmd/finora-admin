/**
 * shared/moneyText.js
 * Oddiy matnli pul formati (bot xabarlari uchun): 3000000 minor UZS -> "30 000 UZS", USD -> "$12.50".
 */

export function formatMoneyPlain(minor, currency) {
  const major = minor / 100;
  if (currency === 'USD') return `$${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Math.round(major).toLocaleString('en-US').replace(/,/g, ' ')} ${currency}`;
}
