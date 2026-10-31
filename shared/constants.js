/**
 * shared/constants.js
 * Domain constants used by BOTH the client and the server.
 * Keep this file free of DOM / Node specific APIs.
 */

export const APP_NAME = 'Finora';
export const APP_SLOGAN = 'Pulingizni biling. Kelajagingizni boshqaring.';

export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

/** Supported currencies. Adding EUR/GBP/RUB later = add a row here + a rate provider pair. */
export const CURRENCIES = Object.freeze({
  UZS: { code: 'UZS', name: 'Oʻzbek soʻmi', symbol: 'UZS', decimals: 0 },
  USD: { code: 'USD', name: 'AQSH dollari', symbol: '$', decimals: 2 },
});
export const DEFAULT_BASE_CURRENCY = 'UZS';

export const TRANSACTION_TYPES = Object.freeze(['income', 'expense']);
export const PAYMENT_METHODS = Object.freeze(['cash', 'card', 'bank', 'other']);
export const BUDGET_PERIODS = Object.freeze(['weekly', 'monthly']);

/** Budget warning thresholds (percent of limit). */
export const BUDGET_WARNING_THRESHOLD = 80;
export const BUDGET_LIMIT_THRESHOLD = 100;

/**
 * System categories. `kind` decides where a category can be used.
 * Ids are stable slugs so localStorage data can be imported into the database later.
 * `color` is used for charts; icons are emoji so they need no assets.
 */
export const SYSTEM_CATEGORIES = Object.freeze([
  { id: 'food', name: 'Ovqat', icon: '\u{1F354}', color: '#F08A24', kind: 'expense' },
  { id: 'transport', name: 'Transport', icon: '\u{1F695}', color: '#3B82F6', kind: 'expense' },
  { id: 'shopping', name: 'Xaridlar', icon: '\u{1F6D2}', color: '#E0559B', kind: 'expense' },
  { id: 'education', name: 'Taʼlim', icon: '\u{1F4DA}', color: '#14A38B', kind: 'expense' },
  { id: 'entertainment', name: 'Koʻngilochar', icon: '\u{1F3AE}', color: '#D6A21B', kind: 'expense' },
  { id: 'health', name: 'Salomatlik', icon: '\u{1F48A}', color: '#22B8CF', kind: 'expense' },
  { id: 'home', name: 'Uy-joy', icon: '\u{1F3E0}', color: '#7C8AA5', kind: 'expense' },
  { id: 'salary', name: 'Maosh', icon: '\u{1F4B0}', color: '#0B8A4D', kind: 'income' },
  { id: 'business', name: 'Biznes', icon: '\u{1F4BC}', color: '#2C5AA0', kind: 'both' },
  { id: 'gifts', name: 'Sovgʻalar', icon: '\u{1F381}', color: '#C2410C', kind: 'both' },
  { id: 'other', name: 'Boshqa', icon: '\u{1F4E6}', color: '#94A3B8', kind: 'both' },
]);

/** Input limits. Enforced by shared/validators.js on client AND server. */
export const LIMITS = Object.freeze({
  descriptionMax: 120,
  goalNameMax: 60,
  noteMax: 500,
  searchMax: 100,
  /** 10^12 major units (a trillion). Keeps integer minor units far below Number.MAX_SAFE_INTEGER. */
  amountMaxMinor: 100_000_000_000_000,
  minDate: '2000-01-01',
  /** Allowed clock skew when checking "not in the future" (ms). */
  futureToleranceMs: 5 * 60 * 1000,
});
