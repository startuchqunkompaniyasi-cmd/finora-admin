/**
 * data/seed.js
 * Generates ~11 weeks of realistic sample transactions on request (onboarding),
 * so the dashboard can be explored immediately. Every sample row carries `isDemo: true`,
 * which means "Clear sample data" removes ONLY these rows and never the user's own.
 */

import { addDays, todayKey, zonedTimeToUtc } from '../../../shared/dates.js';
import { createRandom } from '../utils/random.js';
import { createId } from '../utils/id.js';
import { buildDemoHistory } from '../../../shared/exchangeDemo.js';
import { profileRepo } from './profileRepo.js';
import { transactionsRepo } from './transactionsRepo.js';

const DAYS = 76;
const DEMO_OPENING_BALANCE = 35_000_000 * 100; // minor units
const round = (value, step) => Math.round(value / step) * step;

const DESCRIPTIONS = {
  food: ['Tushlik', 'Oziq-ovqat xaridi', 'Qahva', 'Oilaviy kechki ovqat', 'Non va shirinliklar', 'Meva-sabzavot', 'Olib ketish uchun ovqat'],
  transport: ['Taksi', 'Metro kartasini toʻldirish', 'Avtobus', 'Yoqilgʻi'],
  shopping: ['Kiyim-kechak', 'Krossovka', 'Uy-roʻzgʻor buyumlari', 'Telefon aksessuarlari', 'Kitob va yozuv buyumlari'],
  entertainment: ['Kino', 'Onlayn obuna', 'Dam olish kuni sayri', 'Oʻyin xaridi'],
  health: ['Dorixona', 'Tish shifokori', 'Vitaminlar'],
  gifts: ['Tugʻilgan kun sovgʻasi', 'Gullar'],
  other: ['Telefon hisobini toʻldirish', 'Sartaroshxona', 'Turli mayda xarajatlar'],
};

function buildDemoTransactions({ today, timeZone, now }) {
  const random = createRandom(7_202_609);
  const rates = new Map(buildDemoHistory(today, DAYS).map(({ date, rate }) => [date, rate]));
  const nowMs = now.getTime();
  const transactions = [];

  const add = (dayKey, hour, minute, data) => {
    const occurredAt = zonedTimeToUtc(dayKey, hour, minute, timeZone);
    if (occurredAt.getTime() > nowMs) return; // never create transactions in the future
    transactions.push({
      id: createId(),
      currency: 'UZS',
      fxRateToBase: null,
      note: '',
      isDemo: true,
      occurredAt: occurredAt.toISOString(),
      createdAt: occurredAt.toISOString(),
      updatedAt: occurredAt.toISOString(),
      ...data,
      amount: data.amount * 100, // minor units
    });
  };

  const method = () => random.pick(['card', 'card', 'cash', 'cash', 'bank']);
  const expense = (dayKey, hour, categoryId, amount, paymentMethod = method()) =>
    add(dayKey, hour, random.int(0, 59), {
      type: 'expense',
      categoryId,
      amount,
      description: random.pick(DESCRIPTIONS[categoryId]),
      paymentMethod,
    });

  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    const dayKey = addDays(today, -offset);
    const dayOfMonth = Number(dayKey.slice(8, 10));

    // Recurring monthly items
    if (dayOfMonth === 1) add(dayKey, 9, 30, { type: 'income', categoryId: 'salary', amount: 7_500_000, description: 'Oylik maosh', paymentMethod: 'bank' });
    if (dayOfMonth === 3) add(dayKey, 10, 15, { type: 'expense', categoryId: 'home', amount: 1_800_000, description: 'Ijara haqi', paymentMethod: 'bank' });
    if (dayOfMonth === 8) add(dayKey, 11, 0, { type: 'expense', categoryId: 'education', amount: 650_000, description: 'Onlayn kurs', paymentMethod: 'card' });
    if (dayOfMonth === 12) add(dayKey, 19, 20, { type: 'expense', categoryId: 'home', amount: round(random.int(180_000, 320_000), 1000), description: 'Kommunal xizmatlar', paymentMethod: 'bank' });

    // Freelance income: one USD payment a month, plus a UZS payment roughly every 10 days
    if (dayOfMonth === 14) {
      const rate = rates.get(dayKey) ?? rates.get(today);
      add(dayKey, 15, 40, { type: 'income', categoryId: 'business', amount: 280, currency: 'USD', fxRateToBase: rate, description: 'Frilans loyiha', paymentMethod: 'bank' });
    }
    if (offset % 10 === 4) {
      add(dayKey, 16, 5, { type: 'income', categoryId: 'business', amount: round(random.int(500_000, 1_400_000), 10_000), description: 'Mijoz toʻlovi', paymentMethod: 'bank' });
    }

    // Everyday spending
    expense(dayKey, random.int(12, 14), 'food', round(random.int(28_000, 95_000), 1000));
    if (random.chance(0.55)) expense(dayKey, random.int(18, 21), 'food', round(random.int(35_000, 110_000), 1000));
    if (random.chance(0.7)) expense(dayKey, random.int(8, 18), 'transport', round(random.int(8_000, 38_000), 500), random.pick(['card', 'cash']));
    if (random.chance(0.16)) expense(dayKey, random.int(13, 20), 'shopping', round(random.int(120_000, 650_000), 5000), 'card');
    if (random.chance(0.14)) expense(dayKey, random.int(17, 22), 'entertainment', round(random.int(40_000, 220_000), 1000), 'card');
    if (random.chance(0.06)) expense(dayKey, random.int(10, 17), 'health', round(random.int(60_000, 300_000), 1000));
    if (random.chance(0.03)) expense(dayKey, random.int(12, 19), 'gifts', round(random.int(100_000, 400_000), 5000));
    if (random.chance(0.09)) expense(dayKey, random.int(9, 20), 'other', round(random.int(10_000, 80_000), 1000));
  }

  return transactions;
}

/**
 * Creates the sample data. Called from onboarding when the user picks "Explore with sample data".
 * Does nothing if the user already has transactions.
 */
export async function seedDemoData({ now = new Date() } = {}) {
  const profile = await profileRepo.get();
  if ((await transactionsRepo.list()).length > 0) return false;

  const demo = buildDemoTransactions({ today: todayKey(profile.timezone, now), timeZone: profile.timezone, now });
  await transactionsRepo.replaceAll(demo);
  await profileRepo.update({ hasDemoData: true, demoSeededAt: now.toISOString(), openingBalance: DEMO_OPENING_BALANCE });
  return true;
}

/** Removes only sample rows; anything the user added stays. */
export async function clearDemoData() {
  const all = await transactionsRepo.list();
  await transactionsRepo.replaceAll(all.filter((tx) => !tx.isDemo));
  await profileRepo.update({ hasDemoData: false, openingBalance: 0 });
}
