/**
 * admin/format.js - sana, son va pul formatlari (Asia/Tashkent). Pul butun minor birlikda keladi.
 */

import { formatMoney } from '../utils/format.js';
import { at } from './i18n.js';

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const TZ = 'Asia/Tashkent';

const partsFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

function parts(iso) {
  const out = {};
  for (const p of partsFormatter.formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const p = parts(iso);
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const p = parts(iso);
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}, ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** "3 daqiqa oldin" koʻrinishi. */
export function fmtAgo(iso) {
  if (!iso) return at('adm.never');
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return at('adm.ago.now');
  if (seconds < 3600) return at('adm.ago.minutes', { n: Math.floor(seconds / 60) });
  if (seconds < 86_400) return at('adm.ago.hours', { n: Math.floor(seconds / 3600) });
  if (seconds < 30 * 86_400) return at('adm.ago.days', { n: Math.floor(seconds / 86_400) });
  return fmtDate(iso);
}

const number = new Intl.NumberFormat('en-US');
export const fmtNumber = (n) => (n === null || n === undefined ? '—' : number.format(n).replace(/,/g, ' '));
export const fmtMoney = (minor, currency = 'UZS') => formatMoney(minor, currency);

export function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function fmtDuration(seconds) {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d} k ${h} s` : h ? `${h} s ${m} daq` : `${m} daq`;
}

export const todayKey = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
export const addDaysKey = (key, days) => new Date(new Date(`${key}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
