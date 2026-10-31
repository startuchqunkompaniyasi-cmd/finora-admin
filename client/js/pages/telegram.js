/**
 * pages/telegram.js
 * Telegram ovozli botni hisobga ulash: holat, "Ulash" havolasi, uzish va misollar.
 */

import { h } from '../core/dom.js';
import { icon } from '../utils/icons.js';
import { t } from '../i18n/index.js';
import { getSession, refreshSession } from '../services/authService.js';
import { getTelegramStatus, createTelegramLink, unlinkTelegram } from '../services/telegramService.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { toast } from '../components/toast.js';
import { errorState } from '../components/emptyState.js';

export const title = t('tg.title');

const header = () => h('header', { class: 'page-header' }, h('div', null, h('h1', { class: 'page-header__title' }, t('tg.title')), h('p', { class: 'page-header__subtitle' }, t('tg.subtitle'))));

const examples = () =>
  h(
    'section',
    { class: 'card', style: { marginTop: '16px' } },
    h('h2', { class: 'hub__section' }, t('tg.exampleTitle')),
    h('ul', { class: 'reset-list' }, ['tg.example1', 'tg.example2', 'tg.example3', 'tg.example4'].map((key) => h('li', { style: { padding: '4px 0' } }, t(key)))),
    h('p', { class: 'hub__note' }, t('tg.exampleNote'))
  );

export async function render(ctx) {
  const user = getSession() ?? (await refreshSession());
  if (!user) {
    return h('div', null, header(), h('section', { class: 'card' }, h('h2', null, t('tg.guestTitle')), h('p', null, t('tg.guestText')), h('a', { class: 'btn btn--primary', href: '#/login' }, t('tg.signIn'))));
  }

  let status;
  try {
    status = await getTelegramStatus();
  } catch (error) {
    console.error('[finora] Telegram holati olinmadi', error);
    return h('div', null, header(), h('div', { class: 'card' }, errorState({ title: t('tg.loadFailed'), text: error.message, onRetry: () => ctx.refresh(), retryLabel: t('app.reload') })));
  }

  if (!status.enabled) return h('div', null, header(), h('section', { class: 'card' }, h('p', null, icon('info', { size: 16 }), ' ', t('tg.disabled'))));

  if (status.linked) {
    const unlink = h('button', { class: 'btn btn--secondary btn--sm', type: 'button' }, t('tg.unlink'));
    unlink.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: t('tg.unlinkTitle'), message: t('tg.unlinkMessage'), confirmLabel: t('tg.unlink') }))) return;
      try {
        await unlinkTelegram();
        toast.success(t('tg.unlinked'));
        ctx.refresh();
      } catch (error) {
        toast.error(error.message);
      }
    });
    return h(
      'div',
      null,
      header(),
      h('section', { class: 'card' }, h('h2', null, icon('check', { size: 18 }), ' ', t('tg.linkedTitle')), h('p', null, t('tg.linkedText')), status.telegramUsername ? h('p', { class: 'hub__note' }, t('tg.linkedAs', { username: status.telegramUsername })) : null, unlink),
      examples()
    );
  }

  const connect = h('button', { class: 'btn btn--primary', type: 'button' }, icon('send', { size: 16 }), ' ', t('tg.connect'));
  const check = h('button', { class: 'btn btn--secondary', type: 'button' }, t('tg.refresh'));
  connect.addEventListener('click', async () => {
    connect.disabled = true;
    try {
      const { url } = await createTelegramLink();
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.error(error.message);
    } finally {
      connect.disabled = false;
    }
  });
  check.addEventListener('click', async () => {
    const next = await getTelegramStatus().catch(() => null);
    if (next?.linked) ctx.refresh();
    else toast.info(t('tg.stillWaiting'));
  });

  return h('div', null, header(), h('section', { class: 'card' }, h('h2', null, t('tg.connectTitle')), h('p', null, t('tg.connectText')), h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, connect, check)), examples());
}
