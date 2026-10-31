/**
 * controllers/exchangeController.js
 */

import { isValidDayKey, addDays, todayKey } from '../../shared/dates.js';
import { getSnapshot, getHistory, getRate } from '../services/exchangeService.js';
import { convertMinor } from '../../shared/money.js';

const RANGE_DAYS = { '1D': 2, '7D': 7, '1M': 30, '3M': 90, '6M': 182, '1Y': 365 };

export async function getRates(req, res, next) {
  try {
    res.json({ data: await getSnapshot() });
  } catch (error) {
    next(error);
  }
}

export async function getRatesHistory(req, res, next) {
  try {
    const range = RANGE_DAYS[req.query.range] ? req.query.range : '1M';
    const today = todayKey('Asia/Tashkent');
    const fromKey = isValidDayKey(req.query.from) ? req.query.from : addDays(today, -(RANGE_DAYS[range] - 1));
    const toKey = isValidDayKey(req.query.to) ? req.query.to : today;

    if (fromKey > toKey) {
      return res.status(400).json({ error: { code: 'INVALID_RANGE', message: '"from" sanasi "to" sanasidan keyin boʻlishi mumkin emas.' } });
    }
    res.json({ data: { range, from: fromKey, to: toKey, points: await getHistory({ fromKey, toKey }) } });
  } catch (error) {
    next(error);
  }
}

export async function convert(req, res, next) {
  try {
    const { from, to, amount } = req.query;
    const major = Number(amount);

    if (!['USD', 'UZS'].includes(from) || !['USD', 'UZS'].includes(to)) {
      return res.status(400).json({ error: { code: 'INVALID_CURRENCY', message: 'from/to faqat USD yoki UZS boʻlishi mumkin.' } });
    }
    if (!(major >= 0) || !Number.isFinite(major)) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'amount musbat son boʻlishi kerak.' } });
    }

    const { rate, source } = await getRate(from, to);
    const result = convertMinor(Math.round(major * 100), rate) / 100;
    res.json({ data: { from, to, amount: major, result, rate, source } });
  } catch (error) {
    next(error);
  }
}
