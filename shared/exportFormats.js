/**
 * shared/exportFormats.js
 * Pure builders for downloadable files. No DOM here, so the server can reuse them for
 * GET /api/v1/export, and a PDF builder can be registered next to these later.
 */

import { toBaseMinor } from './money.js';
import { getZonedParts } from './dates.js';

const pad = (n) => String(n).padStart(2, '0');
const decimal = (minor) => (minor / 100).toFixed(2);

/**
 * Spreadsheet apps execute cells that start with = + - @ as formulas. Prefixing an apostrophe
 * keeps user-typed descriptions from becoming a formula-injection vector.
 */
export function neutralizeFormula(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value) {
  const text = neutralizeFormula(String(value ?? ''));
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS = ['Sana', 'Vaqt', 'Turi', 'Summa', 'Valyuta', 'Asosiy valyutadagi summa', 'Asosiy valyuta', 'Kategoriya', 'Tavsif', 'Toʻlov usuli', 'Eslatma', 'ID'];

const TYPE_LABELS = { income: 'Kirim', expense: 'Chiqim' };
const PAYMENT_LABELS = { cash: 'Naqd', card: 'Karta', bank: 'Bank', other: 'Boshqa' };

/**
 * @param {object} options
 * @param {object[]} options.transactions
 * @param {(id:string)=>string} options.categoryName
 * @param {string} options.baseCurrency
 * @param {string} options.timezone
 */
export function buildTransactionsCsv({ transactions, categoryName, baseCurrency, timezone }) {
  const ordered = [...transactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const rows = ordered.map((tx) => {
    const parts = getZonedParts(tx.occurredAt, timezone);
    return [
      `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
      `${pad(parts.hour)}:${pad(parts.minute)}`,
      TYPE_LABELS[tx.type] ?? tx.type,
      decimal(tx.amount),
      tx.currency,
      decimal(toBaseMinor(tx, baseCurrency)),
      baseCurrency,
      categoryName(tx.categoryId),
      tx.description,
      PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod,
      tx.note,
      tx.id,
    ];
  });

  // BOM so Excel opens UTF-8 correctly; CRLF per RFC 4180.
  return `\uFEFF${[CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/** Toʻliq zaxira nusxa. JSON kalitlari texnik (inglizcha) qoladi; summalar butun son (x100). */
export function buildBackupJson({ profile, transactions, exportedAt = new Date() }) {
  return JSON.stringify(
    {
      app: 'Finora',
      formatVersion: 1,
      exportedAt: exportedAt.toISOString(),
      amountUnit: 'minor units (amount x 100)',
      profile: {
        name: profile.name,
        baseCurrency: profile.baseCurrency,
        timezone: profile.timezone,
        openingBalance: profile.openingBalance,
      },
      transactions: transactions.map(({ dayKey, ...stored }) => stored),
    },
    null,
    2
  );
}

/**
 * PDF hujjatning OʻZI bu yerda yasalmaydi (buning uchun brauzerdagi jsPDF kerak — bu fayl esa
 * DOM'siz, serverda ham ishlashi mumkin boʻlishi kerak). Bu yerda faqat sof maʼlumot tayyorlanadi:
 * ustun sarlavhalari va qatorlar — xuddi CSV kabi, lekin Excel formula-himoyasiz (PDF jadvaliga
 * formula xavfi yoʻq) va oʻqilishi osonroq formatda (masalan summa ming ajratuvchi bilan).
 * `client/js/services/exportService.js` shu qatorlarni jsPDF+autoTable bilan chizadi.
 */
export function buildTransactionsPdfRows({ transactions, categoryName, baseCurrency, timezone }) {
  const ordered = [...transactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const columns = ['Sana', 'Turi', 'Summa', 'Kategoriya', 'Tavsif', 'Toʻlov usuli'];
  const rows = ordered.map((tx) => {
    const parts = getZonedParts(tx.occurredAt, timezone);
    const sign = tx.type === 'income' ? '+' : '-';
    return [
      `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
      TYPE_LABELS[tx.type] ?? tx.type,
      `${sign}${decimal(tx.amount)} ${tx.currency}`,
      categoryName(tx.categoryId),
      tx.description || '—',
      PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod,
    ];
  });
  return { columns, rows, baseCurrency };
}

/** Registry: PDF uchun build() client tomonda, chunki haqiqiy chizish (jsPDF) brauzerda boʻladi. */
export const EXPORT_FORMATS = Object.freeze({
  csv: { label: 'CSV', extension: 'csv', mime: 'text/csv;charset=utf-8', description: 'Excel, Google Sheets va Numbers da ochiladi' },
  json: { label: 'JSON', extension: 'json', mime: 'application/json', description: 'Qayta yuklash mumkin boʻlgan toʻliq zaxira nusxa' },
  pdf: { label: 'PDF', extension: 'pdf', mime: 'application/pdf', description: 'Chop etish yoki ulashish uchun formatlangan hisobot' },
});
