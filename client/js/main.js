/**
 * main.js - application bootstrap.
 * Order matters: theme -> data -> shell -> router.
 */

import { config } from './core/config.js';
import { h } from './core/dom.js';
import { on } from './core/events.js';
import { store } from './core/store.js';
import { initTheme } from './core/theme.js';
import { createRouter } from './core/router.js';
import { routes, notFoundRoute } from './core/navigation.js';
import { profileRepo } from './data/profileRepo.js';
import { transactionsRepo } from './data/transactionsRepo.js';
import { createAppShell } from './components/layout/appShell.js';
import { openTransactionModal } from './components/transactionForm.js';
import { startOnboarding } from './components/onboarding.js';
import { refreshSession } from './services/authService.js';
import { errorState } from './components/emptyState.js';
import { t } from './i18n/index.js';
import { showSiteNotice } from './components/siteNotice.js';

const isAdminHash = () => location.hash === '#/admin' || location.hash.startsWith('#/admin/');

async function boot() {
  const root = document.getElementById('app');

  // ADMIN: `#/admin...` manzillarida butunlay alohida admin ilovasi ishga tushadi. Oddiy ilova va admin
  // orqasida oʻtganda sahifa qayta yuklanadi, shuning uchun ikkala qobiq hech qachon aralashmaydi.
  const startedInAdmin = isAdminHash();
  window.addEventListener('hashchange', () => {
    if (isAdminHash() !== startedInAdmin) location.reload();
  });
  if (startedInAdmin) {
    const { bootAdmin } = await import('./admin/adminApp.js');
    await bootAdmin(root);
    return;
  }

  initTheme();

  const profile = await profileRepo.get();
  store.set('profile', profile);
  refreshSession(); // fon rejimida: sessiya bormi tekshiradi, natijani `store`ga yozadi (kutish shart emas)

  const shell = createAppShell({ onAddTransaction: () => openTransactionModal() });
  root.replaceChildren(shell.skipLink, shell.element);
  showSiteNotice(root); // ADMIN: texnik ishlar / e'lon bannerini (agar admin yoqqan bo'lsa) ko'rsatadi

  const router = createRouter({
    routes,
    outlet: shell.outlet,
    notFound: notFoundRoute,
    onNavigate: ({ path }) => shell.setActive(path),
  });

  // Any repository write refreshes the open page. Debounced: one action often writes twice.
  let refreshTimer;
  on('data:changed', async ({ collection }) => {
    if (collection === 'profile') store.set('profile', await profileRepo.get());
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => router.refresh(), 30);
  });

  // Bot (Telegram) yozgan tranzaksiyalar serverda paydo boʻladi: ilovaga qaytganda sahifani yangilaymiz.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && store.get('session')) router.refresh();
  });

  await router.start();
  await maybeStartOnboarding(profile);
}

/** First run: welcome wizard. Someone who already has real data (older version) skips it. */
async function maybeStartOnboarding(profile) {
  if (profile.onboardedAt) return;
  const hasRealData = (await transactionsRepo.list()).some((tx) => !tx.isDemo);
  if (hasRealData) await profileRepo.update({ onboardedAt: new Date().toISOString() });
  else startOnboarding();
}

boot().catch((error) => {
  console.error(`[${config.appName}] Failed to start`, error);
  document.getElementById('app').replaceChildren(
    h('div', { class: 'card', style: { maxWidth: '480px', margin: '20vh auto' } }, errorState({ title: t('app.startFailed'), text: t('app.startFailedHint'), onRetry: () => location.reload(), retryLabel: t('app.reload') }))
  );
});
