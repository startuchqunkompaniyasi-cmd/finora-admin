/**
 * pages/comingSoon.js
 * Keyingi bosqichlarda quriladigan sahifalar uchun "reja" sahifasi va 404 sahifa.
 * Navigatsiya bugunoq toʻliq ishlaydi, marshrutlar allaqachon mavjud.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { emptyState } from '../components/emptyState.js';

function page({ title, iconName, heading, text }) {
  return {
    title,
    render() {
      return h(
        'div',
        null,
        h('header', { class: 'page-header' }, h('h1', { class: 'page-header__title' }, title)),
        h(
          'div',
          { class: 'card placeholder' },
          emptyState({
            iconName,
            title: heading,
            text,
            action: h('a', { class: 'btn btn--secondary btn--sm', href: '#/dashboard' }, icon('home', { size: 16 }), t('placeholder.back')),
          })
        )
      );
    },
  };
}

export function createPlaceholder({ titleKey, icon: iconName, phase, textKey }) {
  return page({ title: t(titleKey), iconName, heading: t('placeholder.phase', { phase }), text: t(textKey) });
}

export const notFoundPage = page({ title: t('notFound.title'), iconName: 'alertCircle', heading: t('notFound.title'), text: t('notFound.text') });
