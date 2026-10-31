/**
 * components/sparkline.js
 * Tiny dependency-free trend line drawn as SVG that stretches to its container width.
 * Colour comes from `currentColor` / --sparkline-color so it themes automatically.
 */

import { s } from '../core/dom.js';

const WIDTH = 300;
const HEIGHT = 80;
const PADDING_Y = 8;
let gradientCounter = 0;

function smoothPath(points) {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    d += ` Q${x},${y} ${(x + nextX) / 2},${(y + nextY) / 2}`;
  }
  const last = points.at(-1);
  return `${d} L${last[0]},${last[1]}`;
}

export function sparkline({ values, ariaLabel, className = '' }) {
  const gradientId = `spark-fill-${(gradientCounter += 1)}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, i) => [
    values.length === 1 ? WIDTH / 2 : (i / (values.length - 1)) * WIDTH,
    PADDING_Y + (1 - (value - min) / span) * (HEIGHT - PADDING_Y * 2),
  ]);
  const linePath = smoothPath(points.length === 1 ? [[0, points[0][1]], [WIDTH, points[0][1]]] : points);

  return s(
    'svg',
    { class: ['sparkline', className], viewBox: `0 0 ${WIDTH} ${HEIGHT}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': ariaLabel },
    s(
      'defs',
      null,
      s('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': 0.3 }),
        s('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': 0 }))
    ),
    s('path', { d: `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`, fill: `url(#${gradientId})`, stroke: 'none' }),
    s('path', { class: 'sparkline__line', d: linePath })
  );
}
