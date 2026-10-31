/**
 * admin/components/charts.js
 * Chart.js (lokal, global `Chart`) ustidagi kichik yordamchi: sahifa DOMga qoʻyilgach yaratiladi,
 * sahifadan chiqilganda yoʻq qilinadi, ranglar CSS tokenlaridan olinadi (yorugʻ/qorongʻi mavzu ishlaydi)
 * va ekran oʻquvchi uchun yashirin jadval qoʻshiladi.
 */

import { h } from '../../core/dom.js';
import { createChart } from '../../components/baseChart.js';
import { srTable } from '../../components/srTable.js';
import { at } from '../i18n.js';
import { emptyBlock } from './ui.js';

/**
 * @param {{onMounted:Function,onCleanup:Function}} ctx
 * @param {{ariaLabel:string, labels:string[], datasets:Array<{label:string, data:number[], kind:'line'|'bar', color:string, yAxisID?:string}>, secondAxis?:boolean}} o
 */
export function timeChart(ctx, { ariaLabel, labels, datasets, secondAxis = false }) {
  if (!labels.length || datasets.every((d) => d.data.every((v) => !v))) {
    return emptyBlock(at('adm.noChartData'));
  }
  const canvas = h('canvas', { role: 'img', 'aria-label': ariaLabel });
  const box = h('div', { class: 'adm-chart' }, canvas, srTable({ caption: ariaLabel, headers: ['', ...datasets.map((d) => d.label)], rows: labels.map((label, i) => [label, ...datasets.map((d) => String(d.data[i]))]) }));

  ctx.onMounted(() => {
    let handle;
    try {
      handle = createChart(canvas, ({ cssVar, animation }) => ({
        type: 'bar',
        data: {
          labels,
          datasets: datasets.map((d) => ({
            type: d.kind,
            label: d.label,
            data: d.data,
            yAxisID: d.yAxisID ?? 'y',
            borderColor: cssVar(d.color),
            backgroundColor: d.kind === 'bar' ? cssVar(d.color) : 'transparent',
            borderWidth: d.kind === 'line' ? 2.5 : 0,
            borderRadius: 4,
            pointRadius: labels.length > 45 ? 0 : 3,
            tension: 0.35,
            maxBarThickness: 18,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: datasets.length > 1, labels: { color: cssVar('--text-muted'), usePointStyle: true, boxWidth: 8 } },
            tooltip: { backgroundColor: cssVar('--tooltip-bg'), titleColor: cssVar('--tooltip-text'), bodyColor: cssVar('--tooltip-text'), padding: 10, cornerRadius: 8 },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: cssVar('--text-faint'), maxTicksLimit: 8, maxRotation: 0 } },
            y: { beginAtZero: true, grid: { color: cssVar('--chart-grid') }, ticks: { color: cssVar('--text-faint'), precision: 0 } },
            ...(secondAxis ? { y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { color: cssVar('--text-faint'), precision: 0 } } } : {}),
          },
        },
      }));
    } catch (error) {
      console.error('[finora/admin] chart failed', error);
      box.replaceChildren(emptyBlock(at('adm.chartFailed')));
      return;
    }
    ctx.onCleanup(() => handle.destroy());
  });
  return box;
}

/** Kunni "10 okt" koʻrinishida qisqartiradi (grafik oʻqi uchun). */
export const shortDay = (key) => {
  const [, m, d] = key.split('-');
  return `${Number(d)}.${m}`;
};
