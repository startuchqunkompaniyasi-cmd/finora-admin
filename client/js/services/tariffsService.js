/**
 * services/tariffsService.js
 * Tariflar (nom, narx, davr, cheklov) DOIM serverdan olinadi (`/api/v1/public/tariffs`), shuning uchun
 * admin paneldagi oʻzgarish hamma foydalanuvchiga darhol yetadi. Server javob bermasa, `shared/plans.js`
 * dagi qotirilgan tariflarga (narxsiz) qaytiladi — sahifa hech qachon boʻsh qolmaydi.
 */

import { config } from '../core/config.js';
import { PLANS, PLAN_IDS } from '../../../shared/plans.js';

export async function fetchTariffs() {
  try {
    const response = await fetch(`${config.apiBase}/public/tariffs`, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    return { tariffs: data.tariffs, currentPlan: data.currentPlan ?? null, fromServer: true };
  } catch (error) {
    console.warn('[finora] Tariflarni serverdan olib boʻlmadi, standart tariflar koʻrsatiladi.', error);
    const tariffs = PLAN_IDS.map((id) => ({ id, name: PLANS[id].name, description: PLANS[id].tagline, priceMinor: 0, billingPeriod: 'monthly', trialDays: 0, limits: {}, isActive: true }));
    return { tariffs, currentPlan: null, fromServer: false };
  }
}
