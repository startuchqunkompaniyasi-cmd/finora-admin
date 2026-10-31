/**
 * services/exportService.js
 * Builds a file from ALL stored transactions and hands it to the browser as a download.
 * Builders come from shared/exportFormats.js (the server reuses them later).
 */

import { EXPORT_FORMATS, buildTransactionsCsv, buildBackupJson, buildTransactionsPdfRows } from '../../../shared/exportFormats.js';
import { todayKey } from '../../../shared/dates.js';
import { transactionsRepo } from '../data/transactionsRepo.js';
import { categoriesRepo } from '../data/categoriesRepo.js';
import { profileRepo } from '../data/profileRepo.js';

/**
 * jsPDF + autoTable `/vendor/*` orqali lokal serverdan `<script defer>` bilan yuklanadi
 * (client/index.html) — `window.jspdf.jsPDF` global sifatida ochiladi. Agar ular hali
 * yuklanmagan boʻlsa (masalan juda sekin tarmoq), foydalanuvchiga tushunarli xabar beramiz —
 * jim-jit buzilib qolgandan koʻra.
 */
function getJsPdfCtor() {
  const ctor = globalThis.jspdf?.jsPDF;
  if (!ctor) throw new Error('PDF kutubxonasi hali yuklanmadi. Sahifani yangilab, qayta urinib koʻring.');
  return ctor;
}

function buildTransactionsPdf({ transactions, profile, categories }) {
  const JsPDF = getJsPdfCtor();
  const { columns, rows } = buildTransactionsPdfRows({
    transactions,
    categoryName: (id) => categories.get(id).name,
    baseCurrency: profile.baseCurrency,
    timezone: profile.timezone,
  });

  const doc = new JsPDF({ orientation: 'landscape', unit: 'pt' });
  doc.setFontSize(14);
  doc.text('Finora — tranzaksiyalar hisoboti', 40, 36);
  doc.setFontSize(9);
  doc.text(`${profile.name ?? ''} · ${rows.length} ta yozuv · asosiy valyuta: ${profile.baseCurrency}`, 40, 52);

  if (typeof doc.autoTable !== 'function') throw new Error('PDF jadval plagini hali yuklanmadi. Sahifani yangilab, qayta urinib koʻring.');
  doc.autoTable({
    head: [columns],
    body: rows,
    startY: 68,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235] }, // client/css/tokens.css dagi --color-primary ga yaqin
    margin: { left: 40, right: 40 },
  });

  return doc.output('blob');
}

const builders = {
  csv: ({ transactions, profile, categories }) =>
    buildTransactionsCsv({ transactions, categoryName: (id) => categories.get(id).name, baseCurrency: profile.baseCurrency, timezone: profile.timezone }),
  json: ({ transactions, profile }) => buildBackupJson({ transactions, profile }),
  pdf: buildTransactionsPdf,
};

export function downloadFile({ filename, mime, content }) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @returns {Promise<{filename:string, count:number}>} */
export async function exportTransactions(formatKey) {
  const format = EXPORT_FORMATS[formatKey];
  if (!format || !builders[formatKey]) throw new Error(`Unsupported export format "${formatKey}"`);

  const [transactions, profile, categories] = await Promise.all([transactionsRepo.list(), profileRepo.get(), categoriesRepo.byId()]);
  const content = builders[formatKey]({ transactions, profile, categories });
  const filename = `finora-tranzaksiyalar-${todayKey(profile.timezone)}.${format.extension}`;

  downloadFile({ filename, mime: format.mime, content });
  return { filename, count: transactions.length };
}
