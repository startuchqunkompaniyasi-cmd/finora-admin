/**
 * admin/components/ui.js
 * Admin sahifalari uchun umumiy qurilish bloklari. Barchasi h()/s() orqali (innerHTML yoʻq):
 * serverdan kelgan har qanday matn (ism, email, sabab) matn tuguni sifatida qoʻyiladi — XSS yoʻq.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { openModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { textField } from '../../components/form/fields.js';
import { at, hasKey } from '../i18n.js';

export const pageHeader = (title, subtitle, ...actions) =>
  h('header', { class: 'adm-pagehead' }, h('div', null, h('h1', { class: 'adm-pagehead__title' }, title), subtitle ? h('p', { class: 'adm-pagehead__sub' }, subtitle) : null), actions.length ? h('div', { class: 'adm-pagehead__actions' }, actions) : null);

export const card = (title, body, { actions, className = '', flush = false } = {}) =>
  h('section', { class: ['adm-card', flush && 'adm-card--flush', className] }, title || actions ? h('header', { class: 'adm-card__head' }, title ? h('h2', { class: 'adm-card__title' }, title) : null, actions ?? null) : null, body);

export function statCard({ label, value, hint, tone, iconName, unavailable = false }) {
  return h(
    'div',
    { class: ['adm-stat', tone && `adm-stat--${tone}`, unavailable && 'is-unavailable'] },
    h('div', { class: 'adm-stat__top' }, h('span', { class: 'adm-stat__label' }, label), iconName ? icon(iconName, { size: 18 }) : null),
    h('p', { class: 'adm-stat__value' }, unavailable ? at('adm.unavailable') : value),
    hint ? h('p', { class: 'adm-stat__hint' }, hint) : null
  );
}

export const badge = (text, tone = 'neutral') => h('span', { class: ['adm-badge', `adm-badge--${tone}`] }, text);

export const note = (text, tone = 'info') => h('p', { class: ['adm-note', `adm-note--${tone}`], role: tone === 'error' ? 'alert' : undefined }, icon(tone === 'warning' || tone === 'error' ? 'alertTriangle' : 'info', { size: 16 }), h('span', null, text));

export const emptyBlock = (text) => h('div', { class: 'adm-empty' }, icon('inbox', { size: 22 }), h('p', null, text));

export const loadingBlock = () => h('div', { class: 'adm-loading', role: 'status' }, h('span', { class: 'adm-spinner', 'aria-hidden': 'true' }), at('adm.loading'));

/**
 * columns: [{ key, label, render?(row) -> Node|string, align?, className? }]
 * Jadval gorizontal aylanadigan oʻram ichida: tor ekranda sahifani buzmaydi.
 */
export function dataTable({ columns, rows, empty = at('adm.empty'), caption }) {
  if (!rows.length) return emptyBlock(empty);
  return h(
    'div',
    { class: 'adm-tablewrap', role: 'region', 'aria-label': caption, tabindex: '0' },
    h(
      'table',
      { class: 'adm-table' },
      caption ? h('caption', { class: 'sr-only' }, caption) : null,
      h('thead', null, h('tr', null, columns.map((c) => h('th', { scope: 'col', class: [c.align === 'end' && 'is-end', c.className] }, c.label)))),
      h('tbody', null, rows.map((row) => h('tr', null, columns.map((c) => h('td', { class: [c.align === 'end' && 'is-end', c.className], 'data-label': c.label }, c.render ? c.render(row) : (row[c.key] ?? '—'))))))
    )
  );
}

export function pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return h('p', { class: 'adm-pager__info' }, at('adm.total', { n: total }));
  const go = (next) => () => onChange(next);
  return h(
    'nav',
    { class: 'adm-pager', 'aria-label': at('adm.pagination') },
    h('span', { class: 'adm-pager__info' }, at('adm.pageOf', { page, pages, total })),
    h('div', { class: 'adm-pager__btns' },
      h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: page <= 1, onClick: go(page - 1) }, icon('chevronLeft', { size: 16 }), at('adm.prev')),
      h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: page >= pages, onClick: go(page + 1) }, at('adm.next'), icon('chevronRight', { size: 16 })))
  );
}

export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

export const tariffName = (tariffs, id) => tariffs?.find((x) => x.id === id)?.name ?? id;

/**
 * Tasdiqlash + SABAB soʻraydigan dialog. Natija: { reason } yoki null (bekor qilindi).
 * Sabab kamida 5 belgi bo'lmaguncha tasdiqlash tugmasi bosilmaydi (server ham tekshiradi).
 */
export function confirmWithReason({ title, message, confirmLabel = at('adm.confirm'), tone = 'danger', requireReason = true, extra }) {
  return new Promise((resolve) => {
    let answered = false;
    let modal;
    const reason = textField({ name: 'reason', label: at('adm.reason'), hint: requireReason ? at('adm.reasonHint') : undefined, multiline: true, rows: 2, maxLength: 500, optional: !requireReason });
    const confirm = h('button', { class: ['btn', tone === 'danger' ? 'btn--danger' : 'btn--primary'], type: 'button', disabled: requireReason }, confirmLabel);
    const cancel = h('button', { class: 'btn btn--secondary', type: 'button' }, at('adm.cancel'));
    const finish = (value) => { answered = true; resolve(value); modal.close(); };
    reason.control.addEventListener('input', () => { confirm.disabled = requireReason && reason.getValue().trim().length < 5; });
    confirm.addEventListener('click', () => finish({ reason: reason.getValue().trim() }));
    cancel.addEventListener('click', () => finish(null));
    modal = openModal({
      title,
      size: 'sm',
      content: h('div', { class: 'adm-form' }, h('p', { class: 'modal__description' }, message), extra ?? null, reason.element, h('div', { class: 'modal__actions' }, cancel, confirm)),
      initialFocus: reason.control,
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

/** Ishni bajarib, xatoni toast bilan koʻrsatadi. true = muvaffaqiyatli. */
export async function attempt(fn, successMessage) {
  try {
    await fn();
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (error) {
    toast.error(error.message);
    return false;
  }
}

/** Checkbox sifatida ishlaydigan "switch" (klaviatura va ekran oʻquvchi uchun haqiqiy checkbox). */
export function switchField({ name, label, hint, checked = false, onChange }) {
  const input = h('input', { type: 'checkbox', class: 'adm-switch__input', name, role: 'switch' });
  input.checked = checked;
  input.addEventListener('change', () => onChange?.(input.checked));
  return {
    element: h('label', { class: 'adm-switch' }, input, h('span', { class: 'adm-switch__track', 'aria-hidden': 'true' }, h('span', { class: 'adm-switch__thumb' })), h('span', { class: 'adm-switch__text' }, h('span', { class: 'adm-switch__label' }, label), hint ? h('span', { class: 'adm-switch__hint' }, hint) : null)),
    input,
    getValue: () => input.checked,
    setValue: (v) => { input.checked = v; },
  };
}

/** Audit amali kodini oʻzbekcha nomga aylantiradi (nomaʼlum kod oʻz holicha koʻrsatiladi). */
export const actionLabel = (action) => (hasKey(`adm.action.${action}`) ? at(`adm.action.${action}`) : action);
