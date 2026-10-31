/**
 * components/baseChart.js
 * Thin wrapper around Chart.js 4 (loaded globally from /vendor/chart.js).
 *  - reads colours from CSS variables, so light/dark themes just work
 *  - re-renders when the theme changes
 *  - always cleans itself up (no leaked canvases/listeners between pages)
 */

import { store } from '../core/store.js';
import { prefersReducedMotion } from '../core/dom.js';

const cssVarCache = new Map();
store.subscribe('theme', () => cssVarCache.clear());

/** Resolved value of a CSS custom property, e.g. cssVar('--positive'). Cached per theme. */
export function cssVar(name) {
  if (!cssVarCache.has(name)) {
    cssVarCache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }
  return cssVarCache.get(name);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(helpers:{cssVar:Function, animation:object}) => object} buildConfig  returns a Chart.js config
 * @returns {{chart: object, destroy: () => void}}
 */
export function createChart(canvas, buildConfig) {
  const ChartJs = globalThis.Chart;
  if (!ChartJs) throw new Error('Chart.js is not loaded (expected /vendor/chart.js/chart.umd.js).');

  ChartJs.defaults.font.family = cssVar('--font-sans');
  ChartJs.defaults.font.size = 12;
  ChartJs.defaults.font.weight = 600;

  const animation = prefersReducedMotion() ? false : { duration: 700, easing: 'easeOutQuart' };
  const chart = new ChartJs(canvas, buildConfig({ cssVar, animation }));
  const unsubscribe = store.subscribe('theme', () => chart.update('none'));

  return {
    chart,
    destroy() {
      unsubscribe();
      chart.destroy();
    },
  };
}
