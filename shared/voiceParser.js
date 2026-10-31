/**
 * shared/voiceParser.js
 * Ovozdan (yoki matndan) tushirilgan oʻzbekcha gapni tranzaksiya qoralamasiga aylantiradi:
 *   "kecha taksiga 30 ming soʻm sarfladim"  ->  { type: 'expense', amount: 30000, currency: 'UZS',
 *                                                  categoryId: 'transport', dayOffset: -1 }
 *
 * Sof funksiyalar (tarmoq/DB yoʻq), shuning uchun osongina sinaladi. Nutqni matnga aylantirish
 * (Whisper va h.k.) xato qilishi mumkin, shu sababli parser GAMINI TAXMIN QILMAYDI: summa topilmasa
 * `amount: null` qaytaradi va bot foydalanuvchidan qayta aytishni soʻraydi.
 *
 * Qoʻllab-quvvatlanadi:
 *  - raqamlar: "50000", "50 000", "50.000", "1,5 mln", "50k", "$12"
 *  - soʻz bilan: "ellik ming", "bir yarim million", "ikki yuz ellik ming", "yigirma besh ming"
 *  - kirill yozuvi (STT ba'zan kirillda qaytaradi): "30 минг сўм"
 *  - valyuta: soʻm / dollar; turi: kirim (maosh, tushdi...) yoki chiqim (standart)
 *  - sana: "bugun", "kecha"
 */

import { SYSTEM_CATEGORIES, LIMITS } from './constants.js';

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e',
  ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** Kichik harf, kirill -> lotin, barcha apostroflar olib tashlanadi ("soʻm" = "som", "toʻrt" = "tort"). */
export function normalizeSpeech(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[а-яёўқғҳ]/g, (ch) => CYRILLIC[ch] ?? ch)
    .replace(/[ʻʼ'’‘`´]/g, '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNITS = {
  nol: 0, bir: 1, ikki: 2, uch: 3, tort: 4, besh: 5, olti: 6, yetti: 7, sakkiz: 8, toqqiz: 9,
  on: 10, yigirma: 20, ottiz: 30, qirq: 40, ellik: 50, oltmish: 60, yetmish: 70, sakson: 80, toqson: 90,
};
const MULTIPLIERS = {
  ming: 1e3, k: 1e3,
  million: 1e6, mln: 1e6, milyon: 1e6,
  milliard: 1e9, mlrd: 1e9, miliard: 1e9,
};
const HUNDRED = 'yuz';
const HALF = 'yarim';

const CURRENCY_WORDS = {
  UZS: ['som', 'sum', 'uzs', 'somlik', 'somga', 'somdan'],
  USD: ['dollar', 'dollarga', 'dollardan', 'usd', 'baks', 'dollarlik'],
};

function currencyOf(token) {
  if (token === '$') return 'USD';
  for (const [code, words] of Object.entries(CURRENCY_WORDS)) if (words.includes(token)) return code;
  return null;
}

/**
 * Matnni tokenlarga ajratadi. "50 000" / "50.000" / "1,5" / "50k" / "$12" birlashtirilib, bitta son tokeni boʻladi.
 * @returns {{kind:'num'|'unit'|'mult'|'hundred'|'half'|'cur'|'word', value?:number, raw:string}[]}
 */
function tokenize(normalized) {
  let text = normalized;
  // "$12" / "12$" -> "12 $"
  text = text.replace(/\$\s*(\d[\d.,]*)/g, '$1 $ ').replace(/(\d)\s*\$/g, '$1 $ ');
  // Minglik guruhlar: "50 000", "1,250,000", "50.000" (nuqta + aynan 3 raqam, oldida 1-3 raqam).
  text = text.replace(/\b\d{1,3}(?:[ ,]\d{3})+(?![\d])/g, (m) => m.replace(/[ ,]/g, ''));
  text = text.replace(/\b(\d{1,3})\.(\d{3})(?![\d.])(?!\s*(?:ming|mln|million|milyon|mlrd|milliard|k\b))/g, '$1$2');
  // "50k", "5mln"
  text = text.replace(/(\d)(k|mln|mlrd)\b/g, '$1 $2');

  return text
    .split(/[^a-z0-9$.,]+/)
    .map((raw) => raw.replace(/^[.,]+|[.,]+$/g, ''))
    .filter(Boolean)
    .map((raw) => {
      if (/^\d+(?:[.,]\d+)?$/.test(raw)) return { kind: 'num', value: Number(raw.replace(',', '.')), raw };
      if (raw in UNITS) return { kind: 'unit', value: UNITS[raw], raw };
      if (raw in MULTIPLIERS) return { kind: 'mult', value: MULTIPLIERS[raw], raw };
      if (raw === HUNDRED) return { kind: 'hundred', raw };
      if (raw === HALF) return { kind: 'half', raw };
      if (raw === '$' || currencyOf(raw)) return { kind: 'cur', raw };
      return { kind: 'word', raw };
    });
}

/** Ketma-ket kelgan son tokenlarini bitta songa hisoblaydi: ["ikki","yuz","ellik","ming"] -> 250000. */
function evaluateRun(run) {
  let total = 0;
  let current = 0;
  let lastMult = 0;
  let sawNumber = false;

  for (const token of run) {
    if (token.kind === 'num' || token.kind === 'unit') {
      current += token.value;
      sawNumber = true;
    } else if (token.kind === 'hundred') {
      current = (current || 1) * 100;
      sawNumber = true;
    } else if (token.kind === 'half') {
      if (lastMult && current === 0) total += lastMult / 2; // "million yarim" = 1,5 million
      else current += 0.5; // "bir yarim million" -> 1,5
      sawNumber = true;
    } else if (token.kind === 'mult') {
      total += (current || 1) * token.value;
      current = 0;
      lastMult = token.value;
      sawNumber = true;
    }
  }
  return sawNumber ? total + current : null;
}

const isNumberToken = (token) => ['num', 'unit', 'hundred', 'half', 'mult'].includes(token.kind);

/** Barcha son guruhlarini topadi (har birining qiymati, keyingi valyuta, koʻplik belgisi bilan). */
function findAmounts(tokens) {
  const found = [];
  let i = 0;
  while (i < tokens.length) {
    if (!isNumberToken(tokens[i])) { i += 1; continue; }
    const start = i;
    while (i < tokens.length && isNumberToken(tokens[i])) i += 1;
    const run = tokens.slice(start, i);
    // Yolgʻiz "k"/"ming" (oldida son yoʻq) — son emas ("ming" soʻzi ham 1000 hisoblanadi, lekin "k" harfi emas).
    if (run.length === 1 && run[0].kind === 'mult' && run[0].raw === 'k') continue;
    const value = evaluateRun(run);
    if (value === null || value <= 0) continue;
    const next = tokens[i];
    found.push({
      value,
      currency: next?.kind === 'cur' ? currencyOf(next.raw) : null,
      adjacentToCurrency: next?.kind === 'cur',
      hasMultiplier: run.some((token) => token.kind === 'mult'),
      isCount: tokens[i]?.raw === 'ta' || tokens[i]?.raw === 'dona', // "3 ta non" — soni, summa emas
    });
  }
  return found;
}

function pickAmount(found) {
  if (found.length === 0) return null;
  const withCurrency = found.filter((item) => item.adjacentToCurrency);
  if (withCurrency.length) return withCurrency[withCurrency.length - 1];
  const notCounts = found.filter((item) => !item.isCount);
  const pool = notCounts.length ? notCounts : found;
  const withMult = pool.filter((item) => item.hasMultiplier);
  const candidates = withMult.length ? withMult : pool;
  return candidates.reduce((best, item) => (item.value > best.value ? item : best));
}

const INCOME_STEMS = ['maosh', 'oylik', 'daromad', 'kirim', 'tushdi', 'tushum', 'topdim', 'avans', 'bonus', 'stipendiya', 'qaytardi', 'qarzni qaytar', 'pul keldi', 'pul oldim', 'foyda', 'dividend'];
const EXPENSE_STEMS = ['sarfla', 'xarajat', 'harajat', 'chiqim', 'toladim', 'tolov', 'sotib oldim', 'xarid qildim', 'ketdi', 'berdim', 'yedim', 'ichdim', 'qarz berdim'];

function detectType(normalized) {
  const words = normalized.split(' ');
  const has = (stem) => (stem.includes(' ') ? normalized.includes(stem) : words.some((word) => word.startsWith(stem)));
  const income = INCOME_STEMS.filter(has).length;
  const expense = EXPENSE_STEMS.filter(has).length;
  return income > expense ? 'income' : 'expense';
}

/** Kategoriya: kalit soʻz ildizlari boʻyicha. Qiymat — `SYSTEM_CATEGORIES` dagi id. */
const CATEGORY_STEMS = [
  ['salary', ['maosh', 'oylik', 'avans', 'stipendiya']],
  ['transport', ['taksi', 'yandex', 'benzin', 'yoqilgi', 'yoqilg', 'metro', 'avtobus', 'mashina', 'parkovka', 'yol kira', 'transport', 'propan', 'metan', 'samolyot', 'aviabilet', 'poyezd']],
  ['health', ['dori', 'apteka', 'shifokor', 'doktor', 'kasalxona', 'klinika', 'tish', 'analiz', 'salomatlik', 'vrach', 'vitamin']],
  ['education', ['kitob', 'kurs', 'oqish', 'maktab', 'universitet', 'daftar', 'repetitor', 'kontrakt', 'talim', 'dars', 'oquv']],
  ['home', ['kommunal', 'elektr', 'svet', 'gaz', 'suv', 'ijara', 'kvartira', 'internet', 'remont', 'arenda', 'uy', 'mebel']],
  ['entertainment', ['kino', 'oyin', 'konsert', 'dam olish', 'teatr', 'klub', 'karaoke', 'netflix', 'playstation', 'kongilochar', 'sayohat']],
  ['gifts', ['sovga', 'tugilgan kun', '=toy', '=toyga', '=toyda', 'hadya', 'xayriya', 'sadaqa']],
  ['food', ['ovqat', 'non', 'osh', 'lagmon', 'kafe', 'restoran', 'tushlik', 'nonushta', 'kechki', 'bozor', 'gosht', 'sut', 'mahsulot', 'oziq', 'choy', 'kofe', 'burger', 'pitsa', 'shirinlik', 'meva', 'sabzavot', 'market', 'fastfud', 'somsa', 'shashlik', 'ichimlik']],
  ['shopping', ['kiyim', 'xarid', 'poyabzal', 'telefon', 'dokon', 'koylak', 'krossovka', 'noutbuk', 'texnika', 'kosmetika']],
  ['business', ['biznes', 'savdo', 'mijoz', 'buyurtma', 'tovar', 'reklama']],
];

function detectCategory(normalized, type) {
  const words = normalized.split(' ');
  const matches = (stem) => {
    if (stem.startsWith('=')) return words.includes(stem.slice(1));
    if (stem.includes(' ')) return normalized.includes(stem);
    return words.some((word) => (stem.length >= 3 ? word.startsWith(stem) : word === stem));
  };
  for (const [categoryId, stems] of CATEGORY_STEMS) {
    if (!stems.some(matches)) continue;
    const category = SYSTEM_CATEGORIES.find((item) => item.id === categoryId);
    if (category && (category.kind === 'both' || category.kind === type)) return categoryId;
  }
  return 'other';
}

function detectDayOffset(normalized) {
  const words = normalized.split(' ');
  if (words.some((word) => word.startsWith('kecha'))) return -1;
  return 0;
}

/** Tavsif: gapning oʻzi (asl yozuvda), birinchi harf katta, `descriptionMax` gacha qisqartirilgan. */
function describe(original) {
  const clean = String(original ?? '').replace(/\s+/g, ' ').trim();
  const text = clean.length > LIMITS.descriptionMax ? `${clean.slice(0, LIMITS.descriptionMax - 1).trimEnd()}…` : clean;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * @param {string} text  nutq matni
 * @returns {{ ok: boolean, amount: number|null, currency: 'UZS'|'USD'|null, type: 'income'|'expense', categoryId: string, description: string, dayOffset: number }}
 *   `amount` — ASOSIY birlikda (soʻm/dollar), minor emas. `currency: null` = aytilmagan (chaqiruvchi hisob valyutasini qoʻyadi).
 */
export function parseSpokenTransaction(text) {
  const normalized = normalizeSpeech(text);
  const picked = pickAmount(findAmounts(tokenize(normalized)));
  const type = detectType(normalized);

  return {
    ok: Boolean(picked),
    amount: picked ? Math.round(picked.value * 100) / 100 : null,
    currency: picked?.currency ?? null,
    type,
    categoryId: detectCategory(normalized, type),
    description: describe(text),
    dayOffset: detectDayOffset(normalized),
  };
}
