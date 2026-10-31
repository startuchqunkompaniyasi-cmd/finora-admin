/**
 * components/exchange/rateHistoryChart.js
 * Kurs tarixi uchun bitta chiziqli grafik (fon toʻldirilgan). incomeExpenseChart bilan bir xil
 * vizual til (baseChart tokenlari), lekin bitta qatorli maʼlumot uchun soddalashtirilgan.
 */

import { h } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { formatLongDay, formatRate, formatShortDay } from '../../utils/format.js';
import { createChart } from '../baseChart.js';
import { errorState } from '../emptyState.js';
import { skeleton } from '../skeleton.js';

export function rateHistoryChart({ lifecycle }) {
  const canvas = h('canvas', { role: 'img', 'aria-label': t('exchange.historyTitle') });
  const box = h('div', { class: 'chart-box rate-history__box' }, canvas);
  let handle = null;

  lifecycle.onCleanup(() => handle?.destroy());

  function render(points) {
    handle?.destroy();
    try {
      handle = createChart(canvas, ({ cssVar, animation }) => ({
        type: 'line',
        data: {
          labels: points.map((point) => point.date),
          datasets: [
            {
              data: points.map((point) => point.rate),
              borderColor: () => cssVar('--usd'),
              backgroundColor: () => cssVar('--usd-soft'),
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHitRadius: 10,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: () => cssVar('--tooltip-bg'),
              titleColor: () => cssVar('--tooltip-text'),
              bodyColor: () => cssVar('--tooltip-text'),
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                title: ([item]) => formatLongDay(points[item.dataIndex].date),
                label: (item) => ` ${formatRate(item.parsed.y)} UZS`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: () => cssVar('--text-muted'), maxTicksLimit: 7, callback: (value, index) => formatShortDay(points[index]?.date ?? points.at(-1).date) },
            },
            y: {
              border: { display: false },
              grid: { color: () => cssVar('--chart-grid') },
              ticks: { color: () => cssVar('--text-muted'), maxTicksLimit: 5, callback: (value) => formatRate(value, 0) },
            },
          },
        },
      }));
    } catch (error) {
      console.error('[finora] Kurs grafigi ishlamadi', error);
      box.replaceChildren(errorState({ title: t('chart.unavailable') }));
    }
  }

  return {
    element: box,
    showLoading() {
      box.replaceChildren(skeleton({ height: '100%' }));
    },
    showError(onRetry) {
      box.replaceChildren(errorState({ title: t('exchange.loadFailed'), onRetry }));
    },
    render,
  };
}
