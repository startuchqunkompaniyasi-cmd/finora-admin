/**
 * components/srTable.js
 * Visually hidden data table that mirrors a chart, so screen-reader users get the numbers.
 */

import { h } from '../core/dom.js';

export function srTable({ caption, headers, rows }) {
  return h(
    'table',
    { class: 'sr-only' },
    h('caption', null, caption),
    h('thead', null, h('tr', null, headers.map((header) => h('th', { scope: 'col' }, header)))),
    h('tbody', null, rows.map((row) => h('tr', null, row.map((cell, i) => h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, cell)))))
  );
}
