/**
 * shared/plans.js
 * Obuna tariflari: Bepul, Premium, Mega Premium.
 *
 * DRAFT. The feature split below is a proposal to be confirmed by the product owner.
 * It is data only: nothing is locked yet (see client config.enforcePlans). Billing needs
 * accounts and a server, so it is planned as phase 7B.
 *
 * `status: 'planned'` = imkoniyat ilovada hali yoʻq.
 * Each plan lists only what it ADDS; use featuresForPlan() for the full set.
 */

export const PLAN_IDS = Object.freeze(['free', 'premium', 'mega']);
export const DEFAULT_PLAN = 'free';

export const PLANS = Object.freeze({
  free: {
    id: 'free',
    name: 'Bepul',
    tagline: 'Hisob yuritishni boshlash uchun kerak boʻlgan hamma narsa.',
    inherits: null,
    features: [
      { key: 'transactions', label: 'Cheksiz tranzaksiya va kategoriyalar', status: 'available' },
      { key: 'weekly-stats', label: 'Haftalik statistika', status: 'planned' },
      { key: 'rates', label: 'Joriy USD/UZS kursi va valyuta konverteri', status: 'planned' },
      { key: 'export-basic', label: 'CSV va JSON eksport', status: 'available' },
      { key: 'budgets-basic', label: '3 tagacha byudjet', status: 'planned' },
      { key: 'goals-basic', label: '2 tagacha jamgʻarma maqsadi', status: 'planned' },
      { key: 'local-data', label: 'Maʼlumotlar shu qurilmada saqlanadi', status: 'available' },
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'Chuqurroq tahlil va cheklovlarsiz.',
    inherits: 'free',
    features: [
      { key: 'stats-full', label: 'Oylik va yillik tahlil', status: 'planned' },
      { key: 'insights', label: 'Aqlli tahlillar', status: 'planned' },
      { key: 'rate-history', label: '1 yilgacha valyuta kursi tarixi', status: 'planned' },
      { key: 'budgets-unlimited', label: 'Cheksiz byudjet va maqsadlar', status: 'planned' },
      { key: 'sync', label: 'Akkaunt va qurilmalar oʻrtasida sinxronlash', status: 'planned' },
      { key: 'export-pdf', label: 'PDF hisobotlar', status: 'planned' },
    ],
  },
  mega: {
    id: 'mega',
    name: 'Mega Premium',
    tagline: 'Pulini biznesdek boshqaradiganlar uchun.',
    inherits: 'premium',
    features: [
      { key: 'currencies', label: 'Qoʻshimcha valyutalar: EUR, GBP, RUB', status: 'planned' },
      { key: 'recurring', label: 'Takrorlanuvchi tranzaksiyalar va eslatmalar', status: 'planned' },
      { key: 'receipts', label: 'Chek rasmlarini biriktirish', status: 'planned' },
      { key: 'shared', label: 'Oila yoki sherik bilan umumiy byudjet', status: 'planned' },
      { key: 'support', label: 'Ustuvor yordam', status: 'planned' },
    ],
  },
});

/** All features a plan includes, own + inherited, in display order. */
export function featuresForPlan(planId) {
  const plan = PLANS[planId];
  if (!plan) return [];
  return [...(plan.inherits ? featuresForPlan(plan.inherits) : []), ...plan.features];
}

export function planIncludes(planId, featureKey) {
  return featuresForPlan(planId).some((feature) => feature.key === featureKey);
}
