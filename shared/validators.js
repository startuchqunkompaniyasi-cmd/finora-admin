/**
 * shared/validators.js
 * ONE validation function for transactions, used by the form (instant feedback)
 * and by the server (the real gatekeeper; never trust the browser).
 *
 * Input is a "draft": what a form or API client sends.
 *   { type, amount, currency, categoryId, description, note, paymentMethod, date, time }
 *   amount may be a string like "1,250.50"; date is "YYYY-MM-DD"; time is "HH:MM" (user's timezone)
 * Output: { ok, errors: { field: oʻzbekcha matn }, errorCodes: { field: kod }, value }
 *   value is the normalised record ready for storage (amount in minor units, occurredAt in UTC).
 */

import { CURRENCIES, TRANSACTION_TYPES, PAYMENT_METHODS, LIMITS } from './constants.js';
import { toMinor } from './money.js';
import { isValidDayKey, todayKey, zonedTimeToUtc } from './dates.js';
import { message, TYPE_WORDS } from './messages.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Field order used to decide which error to focus / announce first. */
export const TRANSACTION_FIELD_ORDER = ['type', 'amount', 'currency', 'categoryId', 'description', 'paymentMethod', 'date', 'time', 'note'];

const cleanLine = (text) => String(text ?? '').replace(CONTROL_CHARS, '').replace(/[\r\n\t]+/g, ' ').trim();
const cleanMultiline = (text) => String(text ?? '').replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n').trim();

/**
 * @param {object} draft
 * @param {object} context
 * @param {string} context.timezone
 * @param {string} context.baseCurrency
 * @param {{id:string, kind:string}[]} [context.categories]  when given, categoryId must exist and match the type
 * @param {number|null} [context.fxRate]                      base currency per 1 unit of draft.currency (required if currency != base)
 * @param {Date} [context.now]
 */
export function validateTransactionDraft(draft, context) {
  const { timezone, baseCurrency, categories = null, fxRate = null, now = new Date() } = context;
  const errors = {};
  const errorCodes = {};
  const fail = (field, code, params) => {
    errorCodes[field] = code;
    errors[field] = message(code, params);
  };

  // type
  const type = draft.type;
  if (!TRANSACTION_TYPES.includes(type)) fail('type', 'type.invalid');

  // currency
  const currency = draft.currency;
  if (!CURRENCIES[currency]) fail('currency', 'currency.invalid');
  else if (currency !== baseCurrency && !(Number(fxRate) > 0)) fail('currency', 'currency.rate');

  // amount
  const amount = toMinor(typeof draft.amount === 'string' ? draft.amount.trim() : draft.amount);
  if (Number.isNaN(amount)) fail('amount', 'amount.invalid');
  else if (amount <= 0) fail('amount', 'amount.zero');
  else if (amount > LIMITS.amountMaxMinor) fail('amount', 'amount.tooLarge');

  // category
  const categoryId = typeof draft.categoryId === 'string' ? draft.categoryId.trim() : '';
  if (!categoryId) {
    fail('categoryId', 'category.required');
  } else if (categories) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) fail('categoryId', 'category.unknown');
    else if (TRANSACTION_TYPES.includes(type) && category.kind !== 'both' && category.kind !== type) {
      fail('categoryId', 'category.mismatch', { type: TYPE_WORDS[type] });
    }
  } else if (categoryId.length > 64) {
    fail('categoryId', 'category.unknown');
  }

  // text
  const description = cleanLine(draft.description);
  if (description.length > LIMITS.descriptionMax) fail('description', 'description.tooLong', { max: LIMITS.descriptionMax });
  const note = cleanMultiline(draft.note);
  if (note.length > LIMITS.noteMax) fail('note', 'note.tooLong', { max: LIMITS.noteMax });

  // payment method
  if (!PAYMENT_METHODS.includes(draft.paymentMethod)) fail('paymentMethod', 'paymentMethod.invalid');

  // date and time -> one UTC instant
  const date = typeof draft.date === 'string' ? draft.date : '';
  const time = draft.time === undefined || draft.time === '' ? '00:00' : String(draft.time);
  let occurredAt = null;

  if (!isValidDayKey(date)) {
    fail('date', 'date.invalid');
  } else if (date < LIMITS.minDate) {
    fail('date', 'date.tooOld');
  } else if (date > todayKey(timezone, now)) {
    fail('date', 'date.future');
  }

  const timeMatch = TIME_PATTERN.exec(time);
  if (!timeMatch) {
    fail('time', 'time.invalid');
  } else if (!errors.date) {
    const instant = zonedTimeToUtc(date, Number(timeMatch[1]), Number(timeMatch[2]), timezone);
    if (instant.getTime() > now.getTime() + LIMITS.futureToleranceMs) fail('time', 'time.future');
    else occurredAt = instant.toISOString();
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    errorCodes,
    value: ok
      ? {
          type,
          amount,
          currency,
          fxRateToBase: currency === baseCurrency ? null : Number(fxRate),
          categoryId,
          description,
          note,
          paymentMethod: draft.paymentMethod,
          occurredAt,
        }
      : null,
  };
}

/** First error message following the form's field order, for toasts. */
export function firstError(errors) {
  const key = TRANSACTION_FIELD_ORDER.find((field) => errors[field]) ?? Object.keys(errors)[0];
  return key ? { field: key, message: errors[key] } : null;
}

/**
 * shared/validators.js (davomi)
 * Byudjet qoralamasi validatsiyasi.
 */

import { BUDGET_PERIODS } from './constants.js';
import { PERIOD_WORDS } from './messages.js';

export const BUDGET_FIELD_ORDER = ['categoryId', 'period', 'limitAmount'];

/**
 * @param {{categoryId:string, period:string, limitAmount:string|number}} draft
 * @param {Object} context
 * @param {{id:string, kind:string}[]} context.categories
 * @param {{id:string, categoryId:string, period:string}[]} context.existingBudgets   boshqa byudjetlar (dublikatni tekshirish uchun)
 * @param {string} [context.excludeId]   tahrirlashda shu byudjetning oʻzini eʼtiborsiz qoldirish
 */
export function validateBudgetDraft(draft, context) {
  const { categories, existingBudgets = [], excludeId = null } = context;
  const errors = {};
  const errorCodes = {};
  const fail = (field, code, params) => {
    errorCodes[field] = code;
    errors[field] = message(code, params);
  };

  const categoryId = typeof draft.categoryId === 'string' ? draft.categoryId.trim() : '';
  const category = categories.find((item) => item.id === categoryId);
  if (!categoryId) fail('categoryId', 'budgetCategory.required');
  else if (!category) fail('categoryId', 'budgetCategory.unknown');
  else if (category.kind !== 'expense' && category.kind !== 'both') fail('categoryId', 'budgetCategory.notExpense');

  const period = draft.period;
  if (!BUDGET_PERIODS.includes(period)) fail('period', 'budgetPeriod.invalid');

  if (!errors.categoryId && !errors.period) {
    const duplicate = existingBudgets.find((budget) => budget.categoryId === categoryId && budget.period === period && budget.id !== excludeId);
    if (duplicate) fail('categoryId', 'budgetCategory.duplicate', { period: PERIOD_WORDS[period] });
  }

  const limitAmount = toMinor(typeof draft.limitAmount === 'string' ? draft.limitAmount.trim() : draft.limitAmount);
  if (Number.isNaN(limitAmount)) fail('limitAmount', 'budgetLimit.invalid');
  else if (limitAmount <= 0) fail('limitAmount', 'budgetLimit.zero');
  else if (limitAmount > LIMITS.amountMaxMinor) fail('limitAmount', 'budgetLimit.tooLarge');

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, errorCodes, value: ok ? { categoryId, period, limitAmount } : null };
}

/**
 * shared/validators.js (davomi)
 * Maqsad qoralamasi va bitta hissa (contribute) validatsiyasi.
 */

export const GOAL_FIELD_ORDER = ['name', 'targetAmount', 'currentAmount', 'deadline'];

const cleanName = (text) => String(text ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();

/**
 * @param {{name:string, targetAmount:string|number, currentAmount:string|number, deadline:string}} draft
 *   `deadline` boʻsh boʻlishi mumkin (muddatsiz maqsad).
 */
export function validateGoalDraft(draft) {
  const errors = {};
  const errorCodes = {};
  const fail = (field, code, params) => {
    errorCodes[field] = code;
    errors[field] = message(code, params);
  };

  const name = cleanName(draft.name);
  if (!name) fail('name', 'goalName.required');
  else if (name.length > LIMITS.goalNameMax) fail('name', 'goalName.tooLong', { max: LIMITS.goalNameMax });

  const targetAmount = toMinor(typeof draft.targetAmount === 'string' ? draft.targetAmount.trim() : draft.targetAmount);
  if (Number.isNaN(targetAmount)) fail('targetAmount', 'goalTarget.invalid');
  else if (targetAmount <= 0) fail('targetAmount', 'goalTarget.zero');
  else if (targetAmount > LIMITS.amountMaxMinor) fail('targetAmount', 'goalTarget.tooLarge');

  const currentRaw = draft.currentAmount === '' || draft.currentAmount === undefined || draft.currentAmount === null ? '0' : draft.currentAmount;
  // Eslatma: toMinor() manfiy sonlarni ham NaN deb qaytaradi (shared/money.js), shuning uchun
  // manfiy kiritilgan qiymat alohida holat sifatida emas, "notoʻgʻri summa" sifatida ushlanadi.
  const currentAmount = toMinor(typeof currentRaw === 'string' ? currentRaw.trim() || '0' : currentRaw);
  if (Number.isNaN(currentAmount)) fail('currentAmount', 'goalCurrent.invalid');
  else if (currentAmount > LIMITS.amountMaxMinor) fail('currentAmount', 'goalCurrent.tooLarge');

  const deadlineRaw = typeof draft.deadline === 'string' ? draft.deadline.trim() : '';
  let deadline = null;
  if (deadlineRaw) {
    if (!isValidDayKey(deadlineRaw)) fail('deadline', 'goalDeadline.invalid');
    else deadline = deadlineRaw;
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, errorCodes, value: ok ? { name, targetAmount, currentAmount, deadline } : null };
}

/** Bitta "pul qoʻshish" (contribute) miqdorini tekshiradi. @returns {{ok, error, amount}} */
export function validateContribution(rawAmount) {
  const amount = toMinor(typeof rawAmount === 'string' ? rawAmount.trim() : rawAmount);
  if (Number.isNaN(amount)) return { ok: false, error: message('contribution.invalid') };
  if (amount <= 0) return { ok: false, error: message('contribution.zero') };
  if (amount > LIMITS.amountMaxMinor) return { ok: false, error: message('contribution.tooLarge') };
  return { ok: true, amount };
}

/**
 * shared/validators.js (davomi)
 * Roʻyxatdan oʻtish va kirish validatsiyasi.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 80;

const cleanPersonName = (text) => String(text ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();

/** @param {{name:string, email:string, password:string}} draft */
export function validateRegisterDraft(draft) {
  const errors = {};
  const errorCodes = {};
  const fail = (field, code, params) => {
    errorCodes[field] = code;
    errors[field] = message(code, params);
  };

  const name = cleanPersonName(draft.name);
  if (!name) fail('name', 'name.required');
  else if (name.length > NAME_MAX_LENGTH) fail('name', 'name.tooLong', { max: NAME_MAX_LENGTH });

  const email = String(draft.email ?? '').trim().toLowerCase();
  if (!email) fail('email', 'email.required');
  else if (!EMAIL_PATTERN.test(email)) fail('email', 'email.invalid');

  const password = String(draft.password ?? '');
  if (!password) fail('password', 'password.required');
  else if (password.length < PASSWORD_MIN_LENGTH) fail('password', 'password.tooShort', { min: PASSWORD_MIN_LENGTH });

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, errorCodes, value: ok ? { name, email, password } : null };
}

/** @param {{email:string, password:string}} draft */
export function validateLoginDraft(draft) {
  const errors = {};
  const errorCodes = {};
  const email = String(draft.email ?? '').trim().toLowerCase();
  const password = String(draft.password ?? '');

  if (!email) {
    errorCodes.email = 'email.required';
    errors.email = message('email.required');
  }
  if (!password) {
    errorCodes.password = 'password.required';
    errors.password = message('password.required');
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, errorCodes, value: ok ? { email, password } : null };
}
