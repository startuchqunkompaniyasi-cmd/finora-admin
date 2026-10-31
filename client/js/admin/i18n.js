/**
 * admin/i18n.js
 * Admin paneli matnlari (oʻzbek, lotin). Ilovaning asosiy lugʻatidan (i18n/uz.js) ATAYLAB alohida:
 * admin kalitlari `adm.` prefiksi bilan boshlanadi va faqat admin kodida ishlatiladi.
 * Yozuv qoidasi asosiy lugʻat bilan bir xil: oʻ/gʻ uchun ʻ (U+02BB), tutuq uchun ʼ (U+02BC).
 */

import dictionary from './uz.js';

export function at(key, vars = {}) {
  const template = dictionary[key];
  if (template === undefined) {
    console.warn(`[finora/admin] Missing translation key: "${key}"`);
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export const hasKey = (key) => key in dictionary;
