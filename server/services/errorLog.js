/**
 * services/errorLog.js
 * Kutilmagan server xatolarining xotiradagi halqasimon buferi (oxirgi 100 ta). Faqat admin
 * bildirishnomalari uchun: xabar va vaqt saqlanadi, stek va soʻrov maʼlumotlari saqlanmaydi.
 * Server qayta ishga tushsa tozalanadi (doimiy saqlash kerak boʻlsa, jadval qoʻshish mumkin).
 */

const MAX = 100;
const entries = [];

export function recordServerError(error) {
  entries.unshift({ message: String(error?.message ?? error).slice(0, 200), at: new Date().toISOString() });
  if (entries.length > MAX) entries.length = MAX;
}

export const recentServerErrors = (limit = 10) => entries.slice(0, limit);
export const serverErrorCount = () => entries.length;
export const __resetErrorLogForTests = () => { entries.length = 0; };
