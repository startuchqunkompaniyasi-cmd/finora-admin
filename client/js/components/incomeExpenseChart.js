/**
 * components/incomeExpenseChart.js
 * Daromad va xarajat ustunlari (ixtiyoriy: sof natija chizigʻi). Uch joyda ishlatiladi:
 * bosh sahifa (hafta), haftalik va oylik/yillik statistika. Chart.js sahifa DOMga qoʻyilgandan
 * keyin yaratiladi (oʻlchami kerak) va sahifadan chiqilganda yoʻq qilinadi.
 *
 * const chart = incomeExpenseChart({ lifecycle: ctx, currency, ariaLabel, initial: weekChartData(series) });
 * chart.update({ ...yangiMaʼlumot })      // qayta yaratmasdan yangilaydi
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { formatCompact, formatMoney } from '../utils/format.js';
import { createChart } from './baseChart.js';
import { errorState } from './emptyState.js';

/** "#0b8a4d" yoki "rgb(11,138,77)" + 0.35 -> "rgba(11,138,77,0.35)". Boshqa formatlar oʻzgarishsiz qaytadi. */
function withAlpha(color, alpha) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})` : color;
}

/**
 * @param {Object} o
 * @param {{onMounted:Function,onCleanup:Function}} o.lifecycle  sahifa ctx
 * @param {{labels:string[], tooltipTitles:string[], income:number[], expense:number[], net?:number[], highlightIndex?:number|null}} o.initial
 * @param {boolean} [o.showNet]         sof natija chizigʻini qoʻshish (`initial.net` kerak)
 * @param {(index:number)=>void} [o.onSelect]  ustun bosilganda
 */
export function incomeExpenseChart({ lifecycle, currency, ariaLabel, initial, showNet = false, onSelect }) {
  let current = initial;
  let handle = null;

  const canvas = h('canvas', { role: 'img', 'aria-label': ariaLabel });
  const box = h('div', { class: 'chart-box' }, canvas);
  const toMajor = (values) => values.map((value) => value / 100);

  // Tanlangan oydan boshqa ustunlar xiralashadi.
  const shade = (color, index) => (current.highlightIndex == null || current.highlightIndex === index ? color : withAlpha(color, 0.32));

  lifecycle.onMounted(() => {
    try {
      handle = createChart(canvas, ({ cssVar, animation }) => ({
        type: 'bar',
        data: {
          labels: current.labels,
          datasets: [
            { label: t('chart.income'), data: toMajor(current.income), backgroundColor: (ctx) => shade(cssVar('--positive'), ctx.dataIndex), borderRadius: 6, borderSkipped: false, maxBarThickness: 22 },
            { label: t('chart.expense'), data: toMajor(current.expense), backgroundColor: (ctx) => shade(cssVar('--negative'), ctx.dataIndex), borderRadius: 6, borderSkipped: false, maxBarThickness: 22 },
            ...(showNet
              ? [{ type: 'line', label: t('chart.net'), data: toMajor(current.net), borderColor: () => cssVar('--focus'), backgroundColor: () => cssVar('--focus'), borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.35, order: 0 }]
              : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation,
          interaction: { mode: 'index', intersect: false },
          datasets: { bar: { categoryPercentage: 0.72, barPercentage: 0.9 } },
          onClick: (event, elements) => {
            if (onSelect && elements.length) onSelect(elements[0].index);
          },
          onHover: (event, elements) => {
            if (event.native?.target) event.native.target.style.cursor = onSelect && elements.length ? 'pointer' : 'default';
          },
          plugins: {
            legend: { display: false }, // izohni karta oʻzi (jami summalar bilan) chizadi
            tooltip: {
              backgroundColor: () => cssVar('--tooltip-bg'),
              titleColor: () => cssVar('--tooltip-text'),
              bodyColor: () => cssVar('--tooltip-text'),
              padding: 12,
              cornerRadius: 10,
              boxPadding: 4,
              callbacks: {
                title: ([item]) => current.tooltipTitles[item.dataIndex],
                label: (item) => ` ${item.dataset.label}: ${formatMoney(Math.round(item.parsed.y * 100), currency)}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: () => cssVar('--text-muted') } },
            y: {
              beginAtZero: !showNet,
              border: { display: false },
              grid: { color: () => cssVar('--chart-grid') },
              ticks: { color: () => cssVar('--text-muted'), maxTicksLimit: 5, callback: (value) => formatCompact(value) },
            },
          },
        },
      }));
      lifecycle.onCleanup(handle.destroy);
    } catch (error) {
      console.error('[finora] Chart failed to render', error);
      box.replaceChildren(errorState({ title: t('chart.unavailable') }));
    }
  });

  return {
    element: box,
    /** Yangi maʼlumot bilan grafikni qayta yaratmasdan yangilaydi. */
    update(next) {
      current = { ...current, ...next };
      if (!handle) return; // hali sahifaga qoʻyilmagan: yaratilganda `current` ishlatiladi
      const { chart } = handle;
      chart.data.labels = current.labels;
      chart.data.datasets[0].data = toMajor(current.income);
      chart.data.datasets[1].data = toMajor(current.expense);
      if (showNet && chart.data.datasets[2]) chart.data.datasets[2].data = toMajor(current.net);
      chart.update();
    },
  };
}
