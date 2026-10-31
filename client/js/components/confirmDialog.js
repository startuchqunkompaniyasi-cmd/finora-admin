/**
 * components/confirmDialog.js
 * const ok = await confirmDialog({ title: 'Delete transaction?', message: '...', confirmLabel: 'Delete' });
 * Focus starts on Cancel so a stray Enter never destroys data.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { openModal } from './modal.js';

export function confirmDialog({ title, message, confirmLabel = t('common.confirm'), cancelLabel = t('common.cancel'), tone = 'danger' }) {
  return new Promise((resolve) => {
    let answered = false;
    let modal;

    const answer = (value) => {
      answered = true;
      resolve(value);
      modal.close();
    };

    const cancel = h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => answer(false) }, cancelLabel);
    const confirm = h('button', { class: ['btn', tone === 'danger' ? 'btn--danger' : 'btn--primary'], type: 'button', onClick: () => answer(true) }, confirmLabel);

    modal = openModal({
      title,
      size: 'sm',
      content: h('div', null, h('p', { class: 'modal__description' }, message), h('div', { class: 'modal__actions' }, cancel, confirm)),
      initialFocus: cancel,
      onClose: () => {
        if (!answered) resolve(false); // Esc or backdrop click
      },
    });
  });
}
