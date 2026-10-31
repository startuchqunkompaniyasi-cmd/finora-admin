/**
 * i18n/index.js
 * t('rate.updated', { time: '14:30' }) -> "Yangilandi: 14:30"
 * Hozir faqat oʻzbek tili bor. Yangi til qoʻshish: shu papkaga fayl qoʻshib, `dictionaries` ga kiritish.
 */

import uz from './uz.js';

const dictionaries = { uz };
let activeLocale = 'uz';

export function setLocale(locale) {
  if (dictionaries[locale]) activeLocale = locale;
}

export function t(key, vars = {}) {
  const template = dictionaries[activeLocale][key];
  if (template === undefined) {
    console.warn(`[finora] Missing translation key: "${key}"`);
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** Test/tooling helper: every key of the active dictionary. */
export const translationKeys = () => Object.keys(dictionaries[activeLocale]);
