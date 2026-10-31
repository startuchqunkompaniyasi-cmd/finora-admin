/**
 * pages/register.js
 * Hisob yaratish. Muvaffaqiyatli boʻlsa avtomatik kirilib, Profilga oʻtkaziladi.
 * Allaqachon kirgan foydalanuvchi bu sahifaga kelsa, darhol Profilga yoʻnaltiriladi.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { register, getSession } from '../services/authService.js';
import { textField } from '../components/form/fields.js';
import { toast } from '../components/toast.js';

export const title = t('auth.registerTitle');

export function render() {
  if (getSession()) {
    location.hash = '#/profile';
    return h('div');
  }

  const fields = {
    name: textField({ name: 'name', label: t('auth.name'), placeholder: t('auth.namePlaceholder'), required: true }),
    email: textField({ name: 'email', label: t('auth.email'), type: 'email', placeholder: t('auth.emailPlaceholder'), required: true }),
    password: textField({ name: 'password', label: t('auth.password'), type: 'password', hint: t('auth.passwordHint'), required: true }),
  };

  const submit = h('button', { class: 'btn btn--primary auth-form__submit', type: 'submit' }, icon('user', { size: 18 }), t('auth.registerSubmit'));
  let saving = false;

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    Object.values(fields).forEach((field) => field.setError(''));

    try {
      const user = await register({ name: fields.name.getValue(), email: fields.email.getValue(), password: fields.password.getValue() });
      toast.success(t('auth.registered', { name: user.name.split(' ')[0] }));
      location.hash = '#/profile';
    } catch (error) {
      if (error.errors) for (const [key, msg] of Object.entries(error.errors)) fields[key]?.setError(msg);
      else if (error.field) fields[error.field]?.setError(error.message);
      toast.error(error.message);
      fields[error.field ?? 'name']?.focus();
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const form = h('form', { class: 'form auth-form', novalidate: true, onSubmit }, fields.name.element, fields.email.element, fields.password.element, submit);

  return h(
    'div',
    { class: 'auth-page' },
    h(
      'div',
      { class: 'card auth-card' },
      h('h1', { class: 'auth-card__title' }, t('auth.registerTitle')),
      h('p', { class: 'auth-card__subtitle' }, t('auth.registerSubtitle')),
      form,
      h('p', { class: 'auth-card__notice' }, icon('info', { size: 14 }), t('auth.localDataNotice')),
      h('p', { class: 'auth-card__switch' }, t('auth.haveAccount'), ' ', h('a', { href: '#/login' }, t('auth.goToLogin')))
    )
  );
}
