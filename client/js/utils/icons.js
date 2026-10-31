/**
 * utils/icons.js
 * Inline SVG icons drawn on a 24x24 grid in the Lucide visual style (2px round stroke).
 * Stored as data (not markup) and built with createElementNS, so no innerHTML is needed
 * and the app has no icon-font or CDN dependency.
 *
 * icon('home', { size: 20, class: 'nav__icon' })
 */

import { s } from '../core/dom.js';

const path = (d) => ['path', { d }];
const circle = (cx, cy, r) => ['circle', { cx, cy, r }];
const rect = (x, y, width, height, rx = 0) => ['rect', { x, y, width, height, rx }];

const ICONS = {
  home: [path('M3 10.5 12 3l9 7.5'), path('M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5')],
  creditCard: [rect(2, 5, 20, 14, 3), path('M2 10h20'), path('M6 15h4')],
  barChart: [path('M4 20v-9'), path('M10 20V4'), path('M16 20v-6'), path('M21 20H3')],
  exchange: [path('m7 4-4 4 4 4'), path('M3 8h13'), path('m17 20 4-4-4-4'), path('M21 16H8')],
  user: [circle(12, 8, 4), path('M4 21a8 8 0 0 1 16 0')],
  wallet: [path('M3 7a2 2 0 0 1 2-2h13v3'), rect(3, 7, 18, 13, 3), path('M16 13.5h2')],
  target: [circle(12, 12, 9), circle(12, 12, 5), circle(12, 12, 1)],
  layoutGrid: [rect(3, 3, 7, 7, 2), rect(14, 3, 7, 7, 2), rect(3, 14, 7, 7, 2), rect(14, 14, 7, 7, 2)],
  bell: [path('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), path('M10.3 21a1.9 1.9 0 0 0 3.4 0')],
  send: [path('m22 2-7 20-4-9-9-4Z'), path('M22 2 11 13')],
  plus: [path('M12 5v14'), path('M5 12h14')],
  sun: [
    circle(12, 12, 4),
    path('M12 2v2'), path('M12 20v2'), path('m4.9 4.9 1.4 1.4'), path('m17.7 17.7 1.4 1.4'),
    path('M2 12h2'), path('M20 12h2'), path('m4.9 19.1 1.4-1.4'), path('m17.7 6.3 1.4-1.4'),
  ],
  moon: [path('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z')],
  x: [path('M18 6 6 18'), path('m6 6 12 12')],
  chevronRight: [path('m9 6 6 6-6 6')],
  chevronLeft: [path('m15 6-6 6 6 6')],
  lightbulb: [path('M9 18h6'), path('M10 22h4'), path('M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z')],
  arrowRight: [path('M5 12h14'), path('m13 6 6 6-6 6')],
  arrowUpRight: [path('M7 17 17 7'), path('M8 7h9v9')],
  arrowDownLeft: [path('M17 7 7 17'), path('M16 17H7V8')],
  trendingUp: [path('m22 7-8.5 8.5-5-5L2 17'), path('M16 7h6v6')],
  trendingDown: [path('m22 17-8.5-8.5-5 5L2 7'), path('M16 17h6v-6')],
  piggyBank: [
    path('M19 11.5c0-3.6-3.1-6.5-7-6.5S5 7.9 5 11.5c0 2.1 1 3.9 2.6 5.1V19h3v-1.2c.5.1 1 .2 1.4.2s.9-.1 1.4-.2V19h3v-2.4c1.6-1.2 2.6-3 2.6-5.1z'),
    path('M19 10h2v3h-2'), path('M9 9.5h.01'),
  ],
  info: [circle(12, 12, 9), path('M12 11v5'), path('M12 8h.01')],
  check: [path('M20 6 9 17l-5-5')],
  checkCircle: [circle(12, 12, 9), path('m8 12.5 2.8 2.8L16 10')],
  alertTriangle: [path('M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'), path('M12 9v4'), path('M12 17h.01')],
  alertCircle: [circle(12, 12, 9), path('M12 8v5'), path('M12 16h.01')],
  refresh: [path('M20 11a8 8 0 0 0-14.5-4.3L3 9'), path('M3 4v5h5'), path('M4 13a8 8 0 0 0 14.5 4.3L21 15'), path('M21 20v-5h-5')],
  clock: [circle(12, 12, 9), path('M12 7v5l3 2')],
  sparkles: [path('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'), path('M19 3v3'), path('M20.5 4.5h-3')],
  inbox: [path('M3 13h5l1.5 3h5L16 13h5'), path('M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z')],
  search: [circle(11, 11, 7), path('m21 21-4.3-4.3')],
  pencil: [path('M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z'), path('m15 5 4 4')],
  trash: [path('M3 6h18'), path('M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'), path('M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'), path('M10 11v6'), path('M14 11v6')],
  download: [path('M12 3v12'), path('m7 10 5 5 5-5'), path('M4 21h16')],
  calendar: [rect(3, 4, 18, 18, 3), path('M16 2v4'), path('M8 2v4'), path('M3 10h18')],
  chevronDown: [path('m6 9 6 6 6-6')],
  lock: [rect(4, 11, 16, 10, 2), path('M8 11V7a4 4 0 0 1 8 0v4')],
  crown: [path('M2.5 8 7 12l5-8 5 8 4.5-4-2 11h-15z')],
  sliders: [path('M4 6h10'), path('M18 6h2'), circle(16, 6, 2), path('M4 12h2'), path('M10 12h10'), circle(8, 12, 2), path('M4 18h12'), path('M20 18h0'), circle(18, 18, 2)],
  moreHorizontal: [circle(5, 12, 1), circle(12, 12, 1), circle(19, 12, 1)],
};

export function icon(name, { size = 20, class: className = '', label } = {}) {
  const shapes = ICONS[name];
  if (!shapes) {
    console.warn(`[finora] Unknown icon: "${name}"`);
    return s('svg', { width: size, height: size, 'aria-hidden': 'true' });
  }

  return s(
    'svg',
    {
      class: ['icon', className],
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      // Decorative by default; pass `label` to make it meaningful for screen readers.
      ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' }),
    },
    ...shapes.map(([tag, attrs]) => s(tag, attrs))
  );
}
