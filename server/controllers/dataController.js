/**
 * controllers/dataController.js
 * Tranzaksiya/byudjet/maqsad/profil uchun REST endpointlar. Barchasi `requireAuth` bilan
 * himoyalangan (faqat hisobga kirgan foydalanuvchi).
 *
 * MUHIM: bu yerga keladigan maʼlumot klient tomonidan ALLAQACHON validatsiya va normallashtirilgan
 * holda keladi (`shared/validators.js` orqali, `transactionsService.saveTransaction()` da) — API
 * shuning uchun toʻliq qoralama validatsiyasini emas, balki NORMALLASHGAN YOZUV shaklini (soddaroq,
 * lekin "hech qachon serverga ishonma" tamoyiliga sodiq) tekshiradi: turlar toʻgʻrimi, sonlar
 * musbat va chegarada, sanalar haqiqiymi. Bazadagi CHECK cheklovlari qoʻshimcha himoya qatlami.
 */

import { TRANSACTION_TYPES, PAYMENT_METHODS, CURRENCIES, BUDGET_PERIODS, LIMITS } from '../../shared/constants.js';
import { isValidDayKey } from '../../shared/dates.js';
import { message, PERIOD_WORDS } from '../../shared/messages.js';
import { getDb } from '../database/db.js';
import { createUsersRepository } from '../repositories/usersRepository.js';
import { createTransactionsRepository } from '../repositories/transactionsRepository.js';
import { createBudgetsRepository } from '../repositories/budgetsRepository.js';
import { createGoalsRepository } from '../repositories/goalsRepository.js';

const db = getDb();
const usersRepository = createUsersRepository(db);
const transactionsRepository = createTransactionsRepository(db);
const budgetsRepository = createBudgetsRepository(db);
const goalsRepository = createGoalsRepository(db);

const badRequest = (res, msg, field) => res.status(400).json({ error: { code: 'INVALID_RECORD', message: msg, field } });
const notFound = (res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Topilmadi.' } });
const conflict = (res, msg) => res.status(409).json({ error: { code: 'CONFLICT', message: msg } });

/**
 * SQLite UNIQUE cheklovi buzilganda (masalan bir xil davr+kategoriya uchun ikkinchi byudjet)
 * xomaki 500 oʻrniga toza 409 qaytaradi. `fn` ichida xato chiqsa va u UNIQUE haqida boʻlsa,
 * `conflictMessage` bilan 409 yuboriladi; aks holda xato qayta otiladi (tashqi error-handler uchun).
 */
function runOrConflict(res, conflictMessage, fn) {
  try {
    return fn();
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error?.message ?? '')) {
      conflict(res, conflictMessage);
      return undefined;
    }
    throw error;
  }
}

/** @returns {string|null} xato boʻlsa xabar matni, hammasi toʻgʻri boʻlsa null. */
function transactionShapeError(body) {
  if (!TRANSACTION_TYPES.includes(body.type)) return { message: 'Notoʻgʻri tranzaksiya turi.', field: 'type' };
  if (!CURRENCIES[body.currency]) return { message: 'Notoʻgʻri valyuta.', field: 'currency' };
  if (!(Number.isInteger(body.amount) && body.amount > 0 && body.amount <= LIMITS.amountMaxMinor)) return { message: 'Notoʻgʻri summa.', field: 'amount' };
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) return { message: 'Notoʻgʻri toʻlov usuli.', field: 'paymentMethod' };
  if (typeof body.categoryId !== 'string' || !body.categoryId) return { message: 'Kategoriya kerak.', field: 'categoryId' };
  if (Number.isNaN(Date.parse(body.occurredAt))) return { message: 'Notoʻgʻri sana.', field: 'occurredAt' };
  return null;
}

function budgetShapeError(body) {
  if (!BUDGET_PERIODS.includes(body.period)) return { message: 'Notoʻgʻri davr.', field: 'period' };
  if (typeof body.categoryId !== 'string' || !body.categoryId) return { message: 'Kategoriya kerak.', field: 'categoryId' };
  if (!(Number.isInteger(body.limitAmount) && body.limitAmount > 0 && body.limitAmount <= LIMITS.amountMaxMinor)) return { message: 'Notoʻgʻri limit.', field: 'limitAmount' };
  return null;
}

function goalShapeError(body) {
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > LIMITS.goalNameMax) return { message: 'Notoʻgʻri nom.', field: 'name' };
  if (!(Number.isInteger(body.targetAmount) && body.targetAmount > 0 && body.targetAmount <= LIMITS.amountMaxMinor)) return { message: 'Notoʻgʻri summa.', field: 'targetAmount' };
  if (body.currentAmount !== undefined && !(Number.isInteger(body.currentAmount) && body.currentAmount >= 0)) return { message: 'Notoʻgʻri summa.', field: 'currentAmount' };
  if (body.deadline && !isValidDayKey(body.deadline)) return { message: 'Notoʻgʻri sana.', field: 'deadline' };
  return null;
}

/** Xato boʻlsa 400 javob yuboradi va true qaytaradi (chaqiruvchi shu yerda toʻxtashi kerak). */
function rejectIfInvalid(res, error) {
  if (!error) return false;
  badRequest(res, error.message, error.field);
  return true;
}

// ---------- Tranzaksiyalar ----------
/**
 * `?limit=&offset=` ixtiyoriy (PHASE 10): hali klient standart oqimida ishlatilmaydi (hamon
 * hammasini bir yoʻla olib, oʻzi filtrlaydi — xavfli katta qayta ishlash oldini olish uchun
 * ataylab oʻzgartirilmadi), lekin API darajasida tayyor: kelajakda juda koʻp tranzaksiyasi bor
 * hisoblar uchun sahifalashga oson oʻtish mumkin. `limit` berilmasa — eski xatti-harakat.
 */
function parsePagination(query) {
  const limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit <= 0) return null;
  const offset = Number(query.offset);
  return { limit: Math.min(limit, LIMITS.transactionsPageMax ?? 200), offset: Number.isInteger(offset) && offset >= 0 ? offset : 0 };
}

export const transactions = {
  list(req, res) {
    const pagination = parsePagination(req.query);
    if (!pagination) return res.json({ data: transactionsRepository.list(req.userId) });
    res.json({
      data: transactionsRepository.list(req.userId, pagination),
      meta: { total: transactionsRepository.count(req.userId), limit: pagination.limit, offset: pagination.offset },
    });
  },
  create(req, res) {
    if (rejectIfInvalid(res, transactionShapeError(req.body))) return;
    res.status(201).json({ data: transactionsRepository.create(req.userId, req.body) });
  },
  update(req, res) {
    const existing = transactionsRepository.get(req.userId, req.params.id);
    if (!existing) return notFound(res);
    if (rejectIfInvalid(res, transactionShapeError({ ...existing, ...req.body }))) return;
    res.json({ data: transactionsRepository.update(req.userId, req.params.id, req.body) });
  },
  remove(req, res) {
    transactionsRepository.remove(req.userId, req.params.id);
    res.status(204).end();
  },
};

// ---------- Byudjetlar ----------
export const budgets = {
  list: (req, res) => res.json({ data: budgetsRepository.list(req.userId) }),
  create(req, res) {
    if (rejectIfInvalid(res, budgetShapeError(req.body))) return;
    const conflictMessage = message('budgetCategory.duplicate', { period: PERIOD_WORDS[req.body.period] ?? req.body.period });
    const created = runOrConflict(res, conflictMessage, () => budgetsRepository.create(req.userId, req.body));
    if (created === undefined) return; // runOrConflict allaqachon 409 yubordi
    res.status(201).json({ data: created });
  },
  update(req, res) {
    const existing = budgetsRepository.get(req.userId, req.params.id);
    if (!existing) return notFound(res);
    if (rejectIfInvalid(res, budgetShapeError({ ...existing, ...req.body }))) return;
    const merged = { ...existing, ...req.body };
    const conflictMessage = message('budgetCategory.duplicate', { period: PERIOD_WORDS[merged.period] ?? merged.period });
    const updated = runOrConflict(res, conflictMessage, () => budgetsRepository.update(req.userId, req.params.id, req.body));
    if (updated === undefined) return;
    res.json({ data: updated });
  },
  remove(req, res) {
    budgetsRepository.remove(req.userId, req.params.id);
    res.status(204).end();
  },
};

// ---------- Maqsadlar ----------
export const goals = {
  list: (req, res) => res.json({ data: goalsRepository.list(req.userId) }),
  create(req, res) {
    if (rejectIfInvalid(res, goalShapeError(req.body))) return;
    res.status(201).json({ data: goalsRepository.create(req.userId, req.body) });
  },
  update(req, res) {
    const existing = goalsRepository.get(req.userId, req.params.id);
    if (!existing) return notFound(res);
    if (rejectIfInvalid(res, goalShapeError({ ...existing, ...req.body }))) return;
    res.json({ data: goalsRepository.update(req.userId, req.params.id, req.body) });
  },
  remove(req, res) {
    goalsRepository.remove(req.userId, req.params.id);
    res.status(204).end();
  },
};

// ---------- Kategoriyalar ----------
// Moslashuvchan (custom) kategoriya qoʻshish uchun UI hali yoʻq — tizim kategoriyalari
// shared/constants.js da (kod ichida). Shuning uchun hozircha doim boʻsh roʻyxat.
export const categories = {
  list: (req, res) => res.json({ data: [] }),
};

// ---------- Moliyaviy profil ----------
export const profile = {
  get(req, res) {
    res.json({ data: usersRepository.getSettings(req.userId) });
  },
  update(req, res) {
    // 'plan' ataylab bu roʻyxatda yoʻq: uni faqat toʻlov oqimi (7B-bosqich) oʻzgartira oladi.
    const allowed = ['baseCurrency', 'timezone', 'openingBalance', 'onboardedAt', 'hasDemoData', 'demoSeededAt'];
    const patch = Object.fromEntries(Object.entries(req.body ?? {}).filter(([key]) => allowed.includes(key)));
    res.json({ data: usersRepository.updateSettings(req.userId, patch) });
  },
};

// ---------- Mahalliy maʼlumotni koʻchirish (faqat roʻyxatdan oʻtishda, klient tomonidan chaqiriladi) ----------
export function importLocalData(req, res) {
  const { transactions: txs = [], budgets: bgs = [], goals: gls = [], profile: prof = {} } = req.body ?? {};

  for (const tx of txs) if (rejectIfInvalid(res, transactionShapeError(tx))) return;
  for (const budget of bgs) if (rejectIfInvalid(res, budgetShapeError(budget))) return;
  for (const goal of gls) if (rejectIfInvalid(res, goalShapeError(goal))) return;

  // Hammasi yoki hech narsa: import yarim-yorti yozilib qolmasligi uchun bitta tranzaksiyada.
  // Masalan, allaqachon mavjud (davr+kategoriya) byudjet duplikatsiyasi topilsa, bu import
  // ichida oldin yozilgan tranzaksiyalar HAM bekor qilinishi kerak.
  db.exec('BEGIN');
  try {
    const allowedProfileKeys = ['baseCurrency', 'timezone', 'openingBalance', 'onboardedAt', 'hasDemoData', 'demoSeededAt'];
    const profilePatch = Object.fromEntries(Object.entries(prof).filter(([key]) => allowedProfileKeys.includes(key)));

    const imported = {
      transactions: transactionsRepository.bulkInsert(req.userId, txs),
      budgets: budgetsRepository.bulkInsert(req.userId, bgs),
      goals: goalsRepository.bulkInsert(req.userId, gls),
    };
    if (Object.keys(profilePatch).length > 0) usersRepository.updateSettings(req.userId, profilePatch);

    db.exec('COMMIT');
    res.json({ data: imported });
  } catch (error) {
    db.exec('ROLLBACK');
    if (/UNIQUE constraint failed/i.test(error?.message ?? '')) {
      return conflict(res, "Import muvaffaqiyatsiz: bir xil davr va kategoriya uchun byudjet allaqachon mavjud.");
    }
    throw error;
  }
}
