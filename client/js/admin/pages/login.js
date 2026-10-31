/**
 * admin/pages/login.js
 * Admin kirish oynasi: ikkita maydon (login, parol) va bitta tugma.
 *
 * "Qochuvchi tugma": maydonlar toʻldirilmaguncha tugma sichqoncha/barmoq yaqinlashganda chetga siljiydi.
 * Bu FAQAT vizual effekt:
 *  - tugma `aria-disabled` (ekran oʻquvchi uchun "oʻchirilgan"), lekin fokus olaveradi — klaviatura
 *    foydalanuvchisi Enter bossa, nima yetishmayotgani aytiladi, hech narsa "tutilib" qolmaydi;
 *  - `prefers-reduced-motion` yoqilgan boʻlsa tugma umuman qochmaydi;
 *  - maydonlar toʻlishi bilan effekt toʻxtaydi va tugma bosiladigan boʻladi;
 *  - haqiqiy tekshiruv doim serverda.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { brandMark } from '../../components/brandLogo.js';
import { at } from '../i18n.js';
import { post } from '../api.js';

const DODGE_RADIUS = 130; // px: pointer shu masofaga yaqinlashsa tugma qochadi

/** Sof hisob (testlash oson): pointer tugmaga yaqinmi va qayoqqa siljish kerak. */
export function computeDodge({ pointer, button, bounds, current = { x: 0, y: 0 }, step = 150 }) {
  const cx = button.left + button.width / 2;
  const cy = button.top + button.height / 2;
  const dx = cx - pointer.x;
  const dy = cy - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance > DODGE_RADIUS) return null;

  // Tugmaning asl joyidan eng koʻpi bilan shuncha siljiy oladi (karta ichida qoladi).
  const maxX = Math.max(0, (bounds.width - button.width) / 2 - 12);
  const maxY = 52; // faqat PASTGA (parol maydoni ustiga chiqmaydi)
  const ux = distance < 1 ? 1 : dx / distance;
  const uy = distance < 1 ? -1 : dy / distance;
  let x = current.x + ux * step;
  let y = current.y + uy * step * 0.45;

  // Chetga yetib qolsa, qarama-qarshi tomonga "sakraydi" (qopqonga tushmaydi).
  if (Math.abs(x) > maxX) x = x > 0 ? -maxX : maxX;
  y = Math.min(Math.max(y, 0), maxY);
  return { x: Math.round(x), y: Math.round(y) };
}

export function renderLogin() {
  const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const username = h('input', { class: 'input', id: 'adm-username', name: 'username', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '64', 'aria-describedby': 'adm-login-status' });
  const password = h('input', { class: 'input', id: 'adm-password', name: 'password', type: 'password', autocomplete: 'current-password', maxlength: '128', 'aria-describedby': 'adm-login-status' });
  const status = h('p', { class: 'adm-login__status', id: 'adm-login-status', role: 'alert', 'aria-live': 'assertive', hidden: true });
  const button = h('button', { class: 'btn btn--primary adm-login__btn', type: 'submit', 'aria-disabled': 'true' }, icon('lock', { size: 18 }), at('adm.login.submit'));
  const stage = h('div', { class: 'adm-login__stage' }, button);

  const complete = () => username.value.trim().length > 0 && password.value.length > 0;
  let position = { x: 0, y: 0 };
  let busy = false;

  function sync() {
    const ready = complete() && !busy;
    button.setAttribute('aria-disabled', ready ? 'false' : 'true');
    button.classList.toggle('is-ready', ready);
    if (complete()) {
      position = { x: 0, y: 0 };
      button.style.setProperty('--dx', '0px');
      button.style.setProperty('--dy', '0px');
    }
  }
  const showError = (message) => {
    status.textContent = message;
    status.hidden = !message;
    card.classList.remove('is-shaking');
    if (message) {
      void card.offsetWidth; // animatsiyani qayta ishga tushiradi
      card.classList.add('is-shaking');
    }
  };
  for (const input of [username, password]) input.addEventListener('input', () => { showError(''); sync(); });

  // Pointer (sichqoncha VA barmoq) kartaga yaqinlashganda tugma qochadi.
  const onPointer = (event) => {
    if (complete() || busy || reduceMotion()) return;
    const next = computeDodge({ pointer: { x: event.clientX, y: event.clientY }, button: button.getBoundingClientRect(), bounds: card.getBoundingClientRect(), current: position });
    if (!next) return;
    position = next;
    button.style.setProperty('--dx', `${next.x}px`);
    button.style.setProperty('--dy', `${next.y}px`);
  };

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!complete()) {
      showError(at('adm.login.incomplete')); // klaviatura/AT foydalanuvchisi uchun tushuntirish
      (username.value.trim() ? password : username).focus();
      return;
    }
    busy = true;
    button.classList.add('is-busy');
    sync();
    try {
      await post('/auth/login', { username: username.value.trim(), password: password.value });
      location.hash = '#/admin/dashboard';
      location.reload();
    } catch (error) {
      busy = false;
      button.classList.remove('is-busy');
      password.value = '';
      showError(error.status === 0 ? error.message : error.status === 429 ? error.message : error.message || at('adm.login.failed'));
      sync();
      password.focus();
    }
  }

  const form = h('form', { class: 'adm-login__form', novalidate: true, onSubmit },
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'adm-username' }, at('adm.login.username')), username),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'adm-password' }, at('adm.login.password')), password),
    status,
    stage
  );

  const card = h('div', { class: 'adm-login__card' },
    h('div', { class: 'adm-login__brand' }, brandMark(44)),
    h('h1', { class: 'adm-login__title' }, at('adm.login.title')),
    h('p', { class: 'adm-login__sub' }, at('adm.login.subtitle')),
    form
  );
  // Butun hujjat boʻyicha kuzatamiz: pointer kartadan tashqarida, lekin tugmaga yaqin boʻlsa ham qochadi.
  document.addEventListener('pointermove', onPointer);
  document.addEventListener('pointerdown', onPointer);

  const back = h('a', { class: 'adm-login__back', href: '#/dashboard' }, at('adm.login.back')); // oddiy ilovaga qaytish (main.js sahifani qayta yuklaydi)
  queueMicrotask(() => username.focus({ preventScroll: true }));
  return h('div', { class: 'adm-login' }, card, back);
}
