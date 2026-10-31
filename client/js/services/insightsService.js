/**
 * services/insightsService.js
 * shared/insights.js tuzilmali natijalarni oʻzbekcha jumlaga aylantiradi.
 * Jumla shablonlari i18n/uz.js da; bu yerda faqat qiymatlarni formatlash.
 */

import { t } from '../i18n/index.js';
import { formatMoney, formatPercent, formatShortDay, weekdayName } from '../utils/format.js';

const ICONS = {
  'top-category-week': 'layoutGrid',
  'category-change-week': (i) => (i.ratio > 0 ? 'trendingUp' : 'trendingDown'),
  'week-vs-last-week': (i) => (i.ratio > 0 ? 'trendingUp' : 'trendingDown'),
  'savings-rate': 'piggyBank',
  overspent: 'alertTriangle',
  'top-category-month': 'layoutGrid',
  'largest-expense-month': 'arrowUpRight',
  'month-vs-last-month': (i) => (i.ratio > 0 ? 'trendingUp' : 'trendingDown'),
  'no-spend-days': 'checkCircle',
  'busiest-weekday': 'calendar',
};

/**
 * @param {object[]} insights   generateInsights() natijasi
 * @param {{baseCurrency:string, categories:{get:(id:string)=>{name:string}}}} context
 * @returns {{id:string, tone:'positive'|'negative'|'neutral', iconName:string, text:string}[]}
 */
export function describeInsights(insights, { baseCurrency, categories }) {
  const money = (amount) => formatMoney(amount, baseCurrency);
  const percent = (ratio) => formatPercent(Math.abs(ratio), { digits: 0 });
  const category = (id) => categories.get(id).name;

  const texts = {
    'top-category-week': (i) => t('insight.topCategoryWeek', { category: category(i.categoryId), amount: money(i.amount) }),
    'category-change-week': (i) => t(i.ratio > 0 ? 'insight.categoryUp' : 'insight.categoryDown', { category: category(i.categoryId), percent: percent(i.ratio) }),
    'week-vs-last-week': (i) => t(i.ratio > 0 ? 'insight.weekUp' : 'insight.weekDown', { percent: percent(i.ratio) }),
    'savings-rate': (i) => t('insight.savedShare', { percent: percent(i.ratio) }),
    overspent: (i) => t('insight.overspent', { amount: money(i.amount) }),
    'top-category-month': (i) => t('insight.topCategoryMonth', { category: category(i.categoryId), amount: money(i.amount), share: percent(i.share) }),
    'largest-expense-month': (i) => t('insight.largestExpense', { amount: money(i.amount), category: category(i.categoryId), date: formatShortDay(i.dayKey) }),
    'month-vs-last-month': (i) => t(i.ratio > 0 ? 'insight.monthUp' : 'insight.monthDown', { percent: percent(i.ratio) }),
    'no-spend-days': (i) => t('insight.noSpendDays', { count: i.count, elapsed: i.elapsed }),
    'busiest-weekday': (i) => t('insight.busiestWeekday', { weekday: weekdayName(i.weekday), amount: money(i.average) }),
  };

  return insights
    .filter((insight) => texts[insight.type])
    .map((insight) => {
      const icon = ICONS[insight.type];
      return { id: insight.id, tone: insight.tone, iconName: typeof icon === 'function' ? icon(insight) : icon ?? 'lightbulb', text: texts[insight.type](insight) };
    });
}
