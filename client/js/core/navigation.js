/**
 * core/navigation.js
 * Marshrutlar VA menyular uchun yagona manba.
 * Yon panel (desktop/planshet) va pastki panel (mobil) shu roʻyxatdan yasaladi.
 *
 * Hali qurilmagan sahifalar `placeholder(...)` orqali "reja" sahifasini ochadi.
 */

import { t } from '../i18n/index.js';

const placeholder = (options) => () => import('../pages/comingSoon.js').then((m) => m.createPlaceholder(options));

const definitions = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'home', sidebar: true, bottom: { labelKey: 'nav.home' }, load: () => import('../pages/dashboard.js') },
  { path: '/transactions', labelKey: 'nav.transactions', icon: 'creditCard', sidebar: true, bottom: { labelKey: 'nav.transactionsShort' }, load: () => import('../pages/transactions.js') },
  { path: '/categories', labelKey: 'nav.categories', icon: 'layoutGrid', sidebar: true, load: () => import('../pages/categories.js') },
  { path: '/statistics', labelKey: 'nav.statistics', icon: 'barChart', sidebar: true, bottom: { labelKey: 'nav.statistics' }, load: () => import('../pages/statistics.js') },
  { path: '/exchange', labelKey: 'nav.exchange', icon: 'exchange', sidebar: true, bottom: { labelKey: 'nav.exchangeShort' }, load: () => import('../pages/exchange.js') },
  { path: '/budgets', labelKey: 'nav.budgets', icon: 'wallet', sidebar: true, load: () => import('../pages/budgets.js') },
  { path: '/goals', labelKey: 'nav.goals', icon: 'target', sidebar: true, load: () => import('../pages/goals.js') },
  { path: '/telegram', labelKey: 'tg.title', icon: 'send', sidebar: false, load: () => import('../pages/telegram.js') },
  { path: '/plans', labelKey: 'nav.plans', icon: 'crown', sidebar: true, load: () => import('../pages/plans.js') },
  { path: '/profile', labelKey: 'nav.profile', icon: 'user', sidebar: true, bottom: { labelKey: 'nav.profile' }, load: () => import('../pages/hub.js') },
];

// login/register menyuda koʻrinmaydi (sidebar: false), lekin marshrut jadvalida bor.
const authOnlyRoutes = [
  { path: '/login', sidebar: false, load: () => import('../pages/login.js') },
  { path: '/register', sidebar: false, load: () => import('../pages/register.js') },
];

export const routes = [...definitions, ...authOnlyRoutes].map((route) => ({ ...route, title: route.labelKey ? t(route.labelKey) : route.title }));

export const notFoundRoute = {
  path: '*',
  title: t('notFound.title'),
  load: () => import('../pages/comingSoon.js').then((m) => m.notFoundPage),
};
