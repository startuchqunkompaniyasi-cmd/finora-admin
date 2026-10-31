/**
 * pages/login.js
 * Hisobga kirish. Allaqachon kirgan boʻlsa Profilga yoʻnaltiriladi.
 */

import { h } from '../core/dom.js';
import { t } from '../i18n/index.js';
import { icon } from '../utils/icons.js';
import { login, getSession } from '../services/authService.js';
import { textField } from '../components/form/fields.js';
import { toast } from '../components/toast.js';

export const title = t('auth.loginTitle');

export function render() {
  if (getSession()) {
    location.hash = '#/profile';
    return h('div');
  }

  const fields = {
    email: textField({ name: 'email', label: t('auth.email'), type: 'email', placeholder: t('auth.emailPlaceholder'), required: true }),
    password: textField({ name: 'password', label: t('auth.password'), type: 'password', required: true }),
  };

  const submit = h('button', { class: 'btn btn--primary auth-form__submit', type: 'submit' }, icon('arrowRight', { size: 18 }), t('auth.loginSubmit'));
  let saving = false;

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;
    submit.disabled = true;
    Object.values(fields).forEach((field) => field.setError(''));

    try {
      const user = await login({ email: fields.email.getValue(), password: fields.password.getValue() });
      toast.success(t('auth.loggedIn', { name: user.name.split(' ')[0] }));
      location.hash = '#/profile';
    } catch (error) {
      if (error.errors) for (const [key, msg] of Object.entries(error.errors)) fields[key]?.setError(msg);
      else if (error.field) fields[error.field]?.setError(error.message);
      else {
        // Umumiy "notoʻgʻri maʼlumot" xatosi — qaysi maydonga tegishli emas, ikkalasiga ham koʻrsatamiz.
        fields.email.setError(' ');
        fields.password.setError(error.message);
      }
      toast.error(error.message);
      fields.email.focus();
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  const form = h('form', { class: 'form auth-form', novalidate: true, onSubmit }, fields.email.element, fields.password.element, submit);

  return h(
    'div',
    { class: 'auth-page' },
    h(
      'div',
      { class: 'card auth-card' },
      h('h1', { class: 'auth-card__title' }, t('auth.loginTitle')),
      h('p', { class: 'auth-card__subtitle' }, t('auth.loginSubtitle')),
      form,
      h('p', { class: 'auth-card__switch' }, t('auth.noAccount'), ' ', h('a', { href: '#/register' }, t('auth.goToRegister')))
    )
  );
}
