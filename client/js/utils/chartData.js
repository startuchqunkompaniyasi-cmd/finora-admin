/**
 * utils/chartData.js
 * Statistika maʼlumotlarini grafik formatiga oʻtkazadi (bir joyda, bosh sahifa ham, statistika ham ishlatadi).
 * Summalar MINOR birlikda qoladi; grafik komponenti oʻzi major birlikka oʻtkazadi.
 */

import { formatShortDay, formatWeekday, monthNameCapitalized, monthNameShort, weekdayName } from './format.js';

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** @param {{dayKey:string, weekday:number, income:number, expense:number}[]} series */
export function weekChartData(series) {
  return {
    labels: series.map((day) => formatWeekday(day.dayKey)),
    tooltipTitles: series.map((day) => `${capitalize(weekdayName(day.weekday))}, ${formatShortDay(day.dayKey)}`),
    income: series.map((day) => day.income),
    expense: series.map((day) => day.expense),
  };
}

/** @param {{month:number, income:number, expense:number, net:number}[]} months */
export function monthChartData(months, year) {
  return {
    labels: months.map((m) => monthNameShort(m.month)),
    tooltipTitles: months.map((m) => `${monthNameCapitalized(m.month)} ${year}`),
    income: months.map((m) => m.income),
    expense: months.map((m) => m.expense),
    net: months.map((m) => m.net),
  };
}
