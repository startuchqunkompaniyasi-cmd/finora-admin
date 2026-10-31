import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTransactionDraft, firstError } from '../../shared/validators.js';
import { SYSTEM_CATEGORIES } from '../../shared/constants.js';

const now = new Date('2026-09-20T10:00:00Z'); // 15:00 in Tashkent
const context = { timezone: 'Asia/Tashkent', baseCurrency: 'UZS', categories: SYSTEM_CATEGORIES, now };
const valid = { type: 'expense', amount: '45,000', currency: 'UZS', categoryId: 'food', description: '  Lunch ', note: '', paymentMethod: 'cash', date: '2026-09-20', time: '12:30' };

test('a valid expense is normalised (minor units, UTC instant, trimmed text)', () => {
  const result = validateTransactionDraft(valid, context);
  assert.ok(result.ok, JSON.stringify(result.errors));
  assert.equal(result.value.amount, 4_500_000);
  assert.equal(result.value.description, 'Lunch');
  assert.equal(result.value.occurredAt, '2026-09-20T07:30:00.000Z');
  assert.equal(result.value.fxRateToBase, null);
});

test('empty, zero, negative and non-numeric amounts are rejected', () => {
  for (const amount of ['', '   ', 'abc', '-5', '1.234']) {
    assert.equal(validateTransactionDraft({ ...valid, amount }, context).errorCodes.amount, 'amount.invalid', `amount "${amount}"`);
  }
  assert.equal(validateTransactionDraft({ ...valid, amount: '0' }, context).errorCodes.amount, 'amount.zero');
  assert.equal(validateTransactionDraft({ ...valid, amount: '0.00' }, context).errorCodes.amount, 'amount.zero');
  assert.equal(validateTransactionDraft({ ...valid, amount: '99999999999999999' }, context).errorCodes.amount, 'amount.tooLarge');
  assert.equal(validateTransactionDraft({ ...valid, amount: '' }, context).errors.amount, 'Iltimos, toʻgʻri summa kiriting.', 'message is Uzbek');
});

test('foreign currency requires an exchange rate and stores it', () => {
  const usd = { ...valid, currency: 'USD', amount: '100' };
  assert.equal(validateTransactionDraft(usd, context).errorCodes.currency, 'currency.rate');
  const ok = validateTransactionDraft(usd, { ...context, fxRate: 12500 });
  assert.ok(ok.ok);
  assert.equal(ok.value.fxRateToBase, 12500);
  assert.equal(ok.value.amount, 10_000);
});

test('category must exist and match the transaction type', () => {
  assert.equal(validateTransactionDraft({ ...valid, categoryId: 'nope' }, context).errorCodes.categoryId, 'category.unknown');
  const mismatch = validateTransactionDraft({ ...valid, categoryId: 'salary' }, context);
  assert.equal(mismatch.errorCodes.categoryId, 'category.mismatch');
  assert.match(mismatch.errors.categoryId, /chiqim/, 'names the transaction type in Uzbek');
  assert.ok(validateTransactionDraft({ ...valid, type: 'income', categoryId: 'salary' }, context).ok);
  assert.ok(validateTransactionDraft({ ...valid, type: 'income', categoryId: 'business' }, context).ok, 'business works for both');
});

test('dates: no future days, no future times today, no invalid days', () => {
  assert.ok(validateTransactionDraft({ ...valid, date: '2026-09-21' }, context).errors.date);
  assert.ok(validateTransactionDraft({ ...valid, date: '2026-02-30' }, context).errors.date);
  assert.ok(validateTransactionDraft({ ...valid, time: '23:00' }, context).errors.time, 'later today');
  assert.ok(validateTransactionDraft({ ...valid, time: '25:00' }, context).errors.time);
  assert.ok(validateTransactionDraft({ ...valid, date: '1999-12-31' }, context).errors.date);
});

test('text is cleaned and length limited; control characters removed', () => {
  const messy = validateTransactionDraft({ ...valid, description: 'a\nb\u0000c' }, context);
  assert.equal(messy.value.description, 'a bc');
  assert.ok(validateTransactionDraft({ ...valid, description: 'x'.repeat(121) }, context).errors.description);
  assert.ok(validateTransactionDraft({ ...valid, note: 'x'.repeat(501) }, context).errors.note);
});

test('bad enum values are rejected and firstError follows field order', () => {
  const result = validateTransactionDraft({ ...valid, type: 'gift', paymentMethod: 'crypto', amount: '' }, context);
  assert.ok(result.errors.type && result.errors.paymentMethod && result.errors.amount);
  assert.equal(firstError(result.errors).field, 'type');
});

import { validateBudgetDraft, BUDGET_FIELD_ORDER } from '../../shared/validators.js';

const budgetContext = { categories: SYSTEM_CATEGORIES, existingBudgets: [{ id: 'b1', categoryId: 'food', period: 'monthly' }] };

test('byudjet: toʻgʻri qoralama normallashadi', () => {
  const result = validateBudgetDraft({ categoryId: 'transport', period: 'weekly', limitAmount: '500,000' }, budgetContext);
  assert.ok(result.ok, JSON.stringify(result.errors));
  assert.deepEqual(result.value, { categoryId: 'transport', period: 'weekly', limitAmount: 50_000_000 });
});

test('byudjet: faqat xarajat kategoriyasi boʻlishi kerak (Maosh rad etiladi)', () => {
  const result = validateBudgetDraft({ categoryId: 'salary', period: 'monthly', limitAmount: '100000' }, budgetContext);
  assert.equal(result.errorCodes.categoryId, 'budgetCategory.notExpense');
});

test('byudjet: bir xil kategoriya + davr uchun dublikat rad etiladi', () => {
  const result = validateBudgetDraft({ categoryId: 'food', period: 'monthly', limitAmount: '100000' }, budgetContext);
  assert.equal(result.errorCodes.categoryId, 'budgetCategory.duplicate');
  assert.match(result.errors.categoryId, /oylik/);
});

test('byudjet: tahrirlashda excludeId oʻzini dublikat sanamaydi', () => {
  const result = validateBudgetDraft({ categoryId: 'food', period: 'monthly', limitAmount: '200000' }, { ...budgetContext, excludeId: 'b1' });
  assert.ok(result.ok);
});

test('byudjet: notoʻgʻri davr va limit', () => {
  assert.equal(validateBudgetDraft({ categoryId: 'food', period: 'daily', limitAmount: '1000' }, budgetContext).errorCodes.period, 'budgetPeriod.invalid');
  assert.equal(validateBudgetDraft({ categoryId: 'transport', period: 'weekly', limitAmount: '0' }, budgetContext).errorCodes.limitAmount, 'budgetLimit.zero');
  assert.equal(validateBudgetDraft({ categoryId: 'transport', period: 'weekly', limitAmount: 'abc' }, budgetContext).errorCodes.limitAmount, 'budgetLimit.invalid');
  assert.equal(BUDGET_FIELD_ORDER[0], 'categoryId');
});

import { validateGoalDraft, validateContribution, GOAL_FIELD_ORDER } from '../../shared/validators.js';

test('maqsad: toʻgʻri qoralama normallashadi (currentAmount ixtiyoriy, deadline boʻsh)', () => {
  const result = validateGoalDraft({ name: '  Yangi noutbuk ', targetAmount: '10,000,000', currentAmount: '', deadline: '' });
  assert.ok(result.ok, JSON.stringify(result.errors));
  assert.deepEqual(result.value, { name: 'Yangi noutbuk', targetAmount: 1_000_000_000, currentAmount: 0, deadline: null });
});

test('maqsad: nom talab qilinadi va uzunlik chegarasi bor', () => {
  assert.equal(validateGoalDraft({ name: '', targetAmount: '1000' }).errorCodes.name, 'goalName.required');
  assert.equal(validateGoalDraft({ name: '   ', targetAmount: '1000' }).errorCodes.name, 'goalName.required');
  assert.equal(validateGoalDraft({ name: 'x'.repeat(61), targetAmount: '1000' }).errorCodes.name, 'goalName.tooLong');
});

test('maqsad: target 0 yoki notoʻgʻri rad etiladi, current manfiy rad etiladi', () => {
  assert.equal(validateGoalDraft({ name: 'A', targetAmount: '0' }).errorCodes.targetAmount, 'goalTarget.zero');
  assert.equal(validateGoalDraft({ name: 'A', targetAmount: 'abc' }).errorCodes.targetAmount, 'goalTarget.invalid');
  assert.equal(validateGoalDraft({ name: 'A', targetAmount: '1000', currentAmount: '-500' }).errorCodes.currentAmount, 'goalCurrent.invalid', 'toMinor manfiylarni ham NaN deb hisoblaydi');
});

test('maqsad: notoʻgʻri sana rad etiladi, toʻgʻrisi saqlanadi', () => {
  assert.equal(validateGoalDraft({ name: 'A', targetAmount: '1000', deadline: '2026-02-30' }).errorCodes.deadline, 'goalDeadline.invalid');
  assert.equal(validateGoalDraft({ name: 'A', targetAmount: '1000', deadline: '2026-12-31' }).value.deadline, '2026-12-31');
  assert.equal(GOAL_FIELD_ORDER[0], 'name');
});

test('contribute: musbat summa qabul qilinadi, notoʻgʻri/manfiy rad etiladi', () => {
  assert.deepEqual(validateContribution('500,000'), { ok: true, amount: 50_000_000 });
  assert.equal(validateContribution('0').ok, false);
  assert.equal(validateContribution('-100').ok, false);
  assert.equal(validateContribution('abc').ok, false);
});
