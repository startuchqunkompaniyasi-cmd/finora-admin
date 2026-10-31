/**
 * providers/exchange/cbuProvider.js
 * O'zbekiston Respublikasi Markaziy banki (CBU) rasmiy JSON API'si. API kalit talab qilinmaydi.
 *
 * Tasdiqlangan haqiqiy javob shakli (2026-yil sentabrda tekshirilgan):
 *   GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/
 *     -> [{ Ccy: "USD", Nominal: "1", Rate: "11839.59", Diff: "6.22", Date: "19.09.2026" }, ...]
 *   GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/{YYYY-MM-DD}/
 *     -> shu kundagi (yoki undan oldingi ish kunidagi, dam olish kuni uchun) kurslar
 *
 * Diqqat: CBU dam olish kunlari uchun oxirgi ish kunining kursini qaytaradi (bu toʻgʻri xatti-harakat).
 * Lekin agar sana parametri butunlay eʼtiborsiz qoldirilsa, server BUGUNGI kursni qaytarishi mumkin.
 * Shu sababli `isPlausibleForDate` bilan javobni tekshiramiz: qaytgan sana soʻralgan sanadan
 * KEYIN boʻlsa yoki undan 5 kundan koʻproq oldin boʻlsa, javob ishonchsiz deb hisoblanadi.
 */

const BASE_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json';
const REQUEST_TIMEOUT_MS = 6000;
const MAX_BACKWARD_DRIFT_DAYS = 5; // dam olish kunlari + bayramlar zanjiri uchun yetarli

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`CBU HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('CBU javobi massiv emas');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** "19.09.2026" -> "2026-09-19" */
function cbuDateToKey(cbuDate) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(cbuDate ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function parseRow(row) {
  const rate = Number(row.Rate);
  const nominal = Number(row.Nominal) || 1;
  const dayKey = cbuDateToKey(row.Date);
  if (!dayKey || !(rate > 0) || !(nominal > 0)) return null;
  return { currency: row.Ccy, rate: rate / nominal, dayKey };
}

function isPlausibleForDate(dayKey, requestedKey) {
  if (dayKey > requestedKey) return false; // kelajak sana qaytarilishi mumkin emas: parametr eʼtiborsiz qoldirilgan
  const drift = (Date.parse(`${requestedKey}T00:00:00Z`) - Date.parse(`${dayKey}T00:00:00Z`)) / 86_400_000;
  return drift <= MAX_BACKWARD_DRIFT_DAYS;
}

export const cbuProvider = {
  id: 'cbu',

  /** Barcha valyutalarning bugungi (yoki oxirgi eʼlon qilingan) kursi. */
  async fetchLatest() {
    const rows = await fetchJson(`${BASE_URL}/`);
    const parsed = rows.map(parseRow).filter(Boolean);
    if (parsed.length === 0) throw new Error('CBU javobida haqiqiy qator topilmadi');
    return parsed;
  },

  /**
   * Bitta kun uchun barcha valyutalar kursi. Javob soʻralgan sanaga mos kelmasa (masalan,
   * sana parametri eʼtiborsiz qoldirilgan boʻlsa), `null` qaytaradi — chaqiruvchi buni
   * "bu sana uchun maʼlumot yoʻq" deb qabul qiladi va boshqa manbaga oʻtadi.
   */
  async fetchForDate(dayKey) {
    const rows = await fetchJson(`${BASE_URL}/all/${dayKey}/`);
    const parsed = rows.map(parseRow).filter(Boolean);
    if (parsed.length === 0) return null;
    const actualDay = parsed[0].dayKey;
    if (!isPlausibleForDate(actualDay, dayKey)) return null;
    return { dayKey: actualDay, rates: parsed };
  },
};
