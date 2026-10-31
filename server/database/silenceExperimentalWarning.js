/**
 * database/silenceExperimentalWarning.js
 * `node:sqlite` hozircha Node'ning "experimental" modulidir (Node 22.5+), har ishlatilganda
 * "ExperimentalWarning" chiqaradi. Bu xabar foydali emas (ongli ravishda tanlangan qaror —
 * docs/ARCHITECTURE.md ga qarang), shuning uchun faqat shu bitta ogohlantirish turini bostiramiz.
 *
 * Diqqat: Node'ning "warning" hodisasiga listener qoʻshish standart konsolga chiqarishni OʻZI
 * toʻxtatmaydi (u alohida, ichki standart listener orqali ishlaydi) — shuning uchun avval
 * standart listenerlarni olib tashlab, keyin faqat SQLite boʻlmagan ogohlantirishlarni qayta
 * chiqaradigan oʻz listenеrimizni qoʻyamiz.
 */

if (!globalThis.__finoraSqliteWarningSilenced) {
  globalThis.__finoraSqliteWarningSilenced = true;
  process.removeAllListeners('warning');
  process.on('warning', (warning) => {
    if (warning.name === 'ExperimentalWarning' && /SQLite/i.test(warning.message)) return;
    console.warn(warning);
  });
}
