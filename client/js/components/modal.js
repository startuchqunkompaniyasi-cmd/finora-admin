/**
 * components/modal.js
 * Accessible dialog: role="dialog" + aria-modal, focus trap, Esc / backdrop to close,
 * focus returns to the element that opened it, page behind is inert and scroll-locked.
 *
 * const modal = openModal({ title: 'Add transaction', content: formElement });
 * modal.close();
 */

import { h, FOCUSABLE_SELECTOR, prefersReducedMotion } from '../core/dom.js';
import { icon } from '../utils/icons.js';
import { t } from '../i18n/index.js';

let activeModal = null;
let titleCounter = 0;

export function openModal({ title, description, content, size = 'md', dismissible = true, onClose, initialFocus } = {}) {
  activeModal?.close();

  const appRoot = document.getElementById('app');
  const opener = document.activeElement;
  const titleId = `modal-title-${(titleCounter += 1)}`;
  const descriptionId = description ? `${titleId}-desc` : undefined;

  const closeButton = dismissible
    ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => close() }, icon('x', { size: 18 }))
    : null;

  const dialog = h(
    'div',
    {
      class: ['modal', size === 'lg' && 'modal--lg', size === 'sm' && 'modal--sm'],
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      tabindex: '-1',
    },
    h(
      'header',
      { class: 'modal__header' },
      h('div', null, h('h2', { class: 'modal__title', id: titleId }, title), description ? h('p', { class: 'modal__description', id: descriptionId }, description) : null),
      closeButton
    ),
    h('div', { class: 'modal__body' }, content)
  );

  const backdrop = h('div', { class: 'modal-backdrop' }, dialog);
  let closed = false;

  function onKeydown(event) {
    if (event.key === 'Escape' && dismissible) {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap: keep Tab inside the dialog even if `inert` is unsupported.
    const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    if (appRoot) appRoot.inert = false;
    document.body.classList.remove('is-locked');
    activeModal = null;

    const finish = () => {
      backdrop.remove();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
      onClose?.();
    };

    if (prefersReducedMotion()) return finish();
    backdrop.dataset.state = 'closing';
    backdrop.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 300); // safety net; finish() is idempotent because remove() is
  }

  backdrop.addEventListener('mousedown', (event) => {
    if (dismissible && event.target === backdrop) close();
  });

  document.addEventListener('keydown', onKeydown, true);
  document.body.append(backdrop);
  document.body.classList.add('is-locked');
  if (appRoot) appRoot.inert = true;

  // Move focus into the dialog: the requested element, else the first control, else the dialog.
  const firstField = dialog.querySelector('.modal__body input, .modal__body select, .modal__body textarea, .modal__body button, .modal__body a[href]');
  const target = initialFocus instanceof HTMLElement && dialog.contains(initialFocus) ? initialFocus : firstField;
  (target ?? dialog).focus({ preventScroll: true });

  activeModal = {
    close,
    /** Multi-step flows (onboarding) update the heading; aria-labelledby keeps pointing at it. */
    setTitle(text) {
      dialog.querySelector(`#${titleId}`).textContent = text;
    },
    setContent(...nodes) {
      dialog.querySelector('.modal__body').replaceChildren(...nodes);
    },
  };
  return activeModal;
}
