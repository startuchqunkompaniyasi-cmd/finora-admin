/**
 * components/siteNotice.js
 * Admin paneli yoqqan ommaviy xabarlarni koʻrsatadi: texnik ishlar rejimi va eʼlon.
 * Server `/api/v1/public/settings` ni bermasa (yoki tarmoq xatosi boʻlsa) jimgina hech narsa
 * koʻrsatmaydi — bu xabarlar ilovaning ishlashiga xalaqit bermasligi kerak.
 * Matn faqat textContent orqali qoʻyiladi (admin yozgan HTML ham matn sifatida chiqadi).
 */

import { h } from '../core/dom.js';
import { icon } from '../utils/icons.js';

export async function showSiteNotice(root) {
  try {
    const response = await fetch('/api/v1/public/settings', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const settings = (await response.json())?.data?.settings;
    if (!settings) return;

    const notices = [];
    if (settings.maintenanceMode && settings.maintenanceMessage) notices.push({ tone: 'warning', text: settings.maintenanceMessage });
    if (settings.announcementEnabled && settings.announcementText) notices.push({ tone: 'info', text: settings.announcementText });
    if (!notices.length) return;

    root.prepend(
      h('div', { class: 'site-notices', role: 'region', 'aria-label': 'Xabarlar' }, notices.map((n) => h('p', { class: ['site-notice', `site-notice--${n.tone}`] }, icon(n.tone === 'warning' ? 'alertTriangle' : 'info', { size: 16 }), h('span', null, n.text))))
    );
  } catch {
    /* ommaviy sozlamalar mavjud emas: hech narsa koʻrsatilmaydi */
  }
}
