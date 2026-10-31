/**
 * utils/format.js
 * Display formatting. Money arrives as integer minor units (see shared/money.js).
 */

import { config } from '../core/config.js';
import { t } from '../i18n/index.js';
import { getZonedParts, parseDayKey, addDays, weekdayIndex } from '../../../shared/dates.js';

const MINUS = '\u2212';

const wholeNumber = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 });
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * formatMoney(1250000_00, 'UZS')  -> "1,250,000 UZS"
 * formatMoney(124550, 'USD')      -> "$1,245.50"
 * formatMoney(500000_00, 'UZS', { sign: true }) -> "+500,000 UZS"
 */
export function formatMoney(minor, currency, { sign = false } = {}) {
  const major = Math.abs(minor) / 100;
  const body = currency === 'USD' ? usdFormat.format(major) : `${wholeNumber.format(major)} ${currency}`;
  const isZero = Math.round(major * (currency === 'USD' ? 100 : 1)) === 0;

  if (isZero) return body;
  if (minor < 0) return `${MINUS}${body}`;
  return sign ? `+${body}` : body;
}

/** Grafik oʻqlari uchun qisqa summa: 1,2 mln, 500 ming, 2 mlrd. MAJOR birlikda qabul qiladi. */
export function formatCompact(major) {
  const abs = Math.abs(major);
  const scaled = (divisor, suffix) => {
    const value = Math.round((abs / divisor) * 10) / 10;
    return `${major < 0 ? MINUS : ''}${value} ${suffix}`;
  };
  if (abs >= 1e9) return scaled(1e9, 'mlrd');
  if (abs >= 1e6) return scaled(1e6, 'mln');
  if (abs >= 1e3) return scaled(1e3, 'ming');
  return `${major < 0 ? MINUS : ''}${wholeNumber.format(abs)}`;
}

/** formatPercent(0.124, { sign: true }) -> "+12.4%" */
export function formatPercent(ratio, { sign = false, digits = 1 } = {}) {
  const value = (ratio * 100).toFixed(digits);
  const isZero = Number(value) === 0;
  if (isZero) return `${(0).toFixed(digits)}%`;
  if (ratio < 0) return `${MINUS}${Math.abs(Number(value)).toFixed(digits)}%`;
  return `${sign ? '+' : ''}${value}%`;
}

/** Exchange rate with grouping and up to `digits` decimals: 12,150.25 */
export function formatRate(rate, digits = 2) {
  return new Intl.NumberFormat(config.locale, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(rate);
}

// Oʻzbekcha kalendar soʻzlari. Intl chiqishi brauzerlarda farq qiladi, shuning uchun qatʼiy roʻyxatlar.
const MONTHS_LONG = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const WEEKDAYS_LONG = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'];
const WEEKDAYS_SHORT = ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'];

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** Oy nomi: monthName(9) -> "sentabr" (1 = yanvar). */
export const monthName = (month) => MONTHS_LONG[month - 1];
/** "Sentabr" (bosh harf bilan, alohida turganda). */
export const monthNameCapitalized = (month) => capitalize(MONTHS_LONG[month - 1]);
export const monthNameShort = (month) => capitalize(MONTHS_SHORT[month - 1]);
/** weekdayName(0) -> "dushanba" (0 = dushanba). */
export const weekdayName = (index) => WEEKDAYS_LONG[index];

/** "20 sen" */
export function formatShortDay(dayKey) {
  const date = parseDayKey(dayKey);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/** "Yakshanba, 20 sentabr 2026" */
export function formatLongDay(dayKey) {
  const date = parseDayKey(dayKey);
  return `${capitalize(WEEKDAYS_LONG[weekdayIndex(dayKey)])}, ${date.getUTCDate()} ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "Sentabr 2026" */
export function formatMonthYear(dayKey) {
  const date = parseDayKey(dayKey);
  return `${capitalize(MONTHS_LONG[date.getUTCMonth()])} ${date.getUTCFullYear()}`;
}

/** "Dush" */
export function formatWeekday(dayKey) {
  return WEEKDAYS_SHORT[weekdayIndex(dayKey)];
}

/** "14\u201320 sen" (en dash) */
export function formatDayRange(fromKey, toKey) {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  const start = sameMonth ? String(from.getUTCDate()) : formatShortDay(fromKey);
  return `${start}\u2013${formatShortDay(toKey)}`;
}

/** "14:30" in the given timezone (24 hour clock). */
export function formatTime(input, timeZone) {
  const { hour, minute } = getZonedParts(input, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "Today" / "Yesterday" / "18 Sep" */
export function formatRelativeDay(dayKey, todayDayKey) {
  if (dayKey === todayDayKey) return t('common.today');
  if (dayKey === addDays(todayDayKey, -1)) return t('common.yesterday');
  return formatShortDay(dayKey);
}

export function greetingKey(hour) {
  if (hour >= 5 && hour < 12) return 'greeting.morning';
  if (hour >= 12 && hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

export function initials(name) {
  const letters = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());
  return letters.join('');
}
