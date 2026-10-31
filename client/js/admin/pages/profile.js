/**
 * admin/pages/profile.js
 * Admin hisobi: login/parol almashtirish (joriy parol bilan), sessiyalar, kirish tarixi, chiqish.
 * 2FA hozircha qoʻllab-quvvatlanmaydi (ochiq aytiladi). Parol siyosatini SERVER tekshiradi; bu yerdagi
 * koʻrsatma faqat maslahat.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { textField } from '../../components/form/fields.js';
import { toast } from '../../components/toast.js';
import { at } from '../i18n.js';
import { get, post } from '../api.js';
import { fmtDateTime } from '../format.js';
import { pageHeader, card, badge, dataTable, note, attempt } from '../components/ui.js';

export const title = at('adm.nav.profile');

export async function render(ctx) {
  const [{ admin }, { sessions }, { events }] = await Promise.all([get('/auth/me'), get('/auth/sessions'), get('/auth/login-activity')]);

  const pw = { current: textField({ name: 'cur', label: at('adm.prof.currentPw'), type: 'password', required: true, maxLength: 128 }), next: textField({ name: 'new', label: at('adm.prof.newPw'), type: 'password', hint: at('adm.prof.pwHint'), required: true, maxLength: 128 }), confirm: textField({ name: 'conf', label: at('adm.prof.confirmPw'), type: 'password', required: true, maxLength: 128 }) };
  for (const f of Object.values(pw)) f.control.autocomplete = f === pw.current ? 'current-password' : 'new-password';
  const pwForm = h('form', { class: 'adm-form', novalidate: true, onSubmit: async (event) => {
    event.preventDefault();
    Object.values(pw).forEach((f) => f.setError(''));
    try {
      await post('/auth/change-password', { currentPassword: pw.current.getValue(), newPassword: pw.next.getValue(), confirmPassword: pw.confirm.getValue() });
      toast.success(at('adm.prof.pwChanged'));
      ctx.refresh();
    } catch (error) {
      const target = { currentPassword: pw.current, newPassword: pw.next, confirmPassword: pw.confirm }[error.field] ?? pw.next;
      target.setError(error.message);
    }
  } }, pw.current.element, pw.next.element, pw.confirm.element, h('div', { class: 'adm-form__actions' }, h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, at('adm.prof.changePw'))));

  const un = { name: textField({ name: 'uname', label: at('adm.prof.newUsername'), value: admin.username, maxLength: 32, required: true }), pw: textField({ name: 'unpw', label: at('adm.prof.currentPw'), type: 'password', required: true, maxLength: 128 }) };
  un.pw.control.autocomplete = 'current-password';
  const unForm = h('form', { class: 'adm-form', novalidate: true, onSubmit: async (event) => {
    event.preventDefault();
    try {
      await post('/auth/change-username', { username: un.name.getValue(), currentPassword: un.pw.getValue() });
      toast.success(at('adm.saved'));
      ctx.refresh();
    } catch (error) {
      (error.field === 'currentPassword' ? un.pw : un.name).setError(error.message);
    }
  } }, un.name.element, un.pw.element, h('div', { class: 'adm-form__actions' }, h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, at('adm.save'))));

  const revoke = h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: sessions.length < 2, onClick: async () => { if (await attempt(() => post('/auth/sessions/revoke-others'), at('adm.prof.revoked'))) ctx.refresh(); } }, at('adm.prof.revokeOthers'));

  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.profile'), at('adm.prof.signedInAs', { name: admin.username })),
    ctx.query.get('force') || admin.mustChangePassword ? note(at('adm.mustChange'), 'warning') : null,
    h('div', { class: 'adm-grid adm-grid--2' }, card(at('adm.prof.password'), pwForm), card(at('adm.prof.username'), unForm)),
    card(at('adm.prof.sessions'), h('div', null, dataTable({ caption: at('adm.prof.sessions'), rows: sessions, columns: [
      { key: 'userAgent', label: at('adm.prof.device'), render: (r) => h('span', null, (r.userAgent || '—').slice(0, 60), ' ', r.current ? badge(at('adm.prof.current'), 'positive') : null) },
      { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
      { key: 'createdAt', label: at('adm.prof.started'), render: (r) => fmtDateTime(r.createdAt) },
      { key: 'lastSeenAt', label: at('adm.prof.lastSeen'), render: (r) => fmtDateTime(r.lastSeenAt) },
    ] }), h('div', { class: 'adm-form__actions' }, revoke)), { flush: true }),
    card(at('adm.prof.loginActivity'), dataTable({ caption: at('adm.prof.loginActivity'), rows: events, columns: [
      { key: 'createdAt', label: at('adm.col.date'), render: (r) => fmtDateTime(r.createdAt) },
      { key: 'username', label: at('adm.login.username') },
      { key: 'success', label: at('adm.audit.result'), render: (r) => badge(r.success ? at('adm.ok') : at('adm.prof.failedLogin'), r.success ? 'positive' : 'negative') },
      { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
    ] }), { flush: true }),
    note(at('adm.prof.no2fa')),
    h('p', null, h('a', { class: 'btn btn--secondary btn--sm', href: '#/admin/dashboard' }, icon('chevronLeft', { size: 16 }), at('adm.nav.home')))
  );
}
