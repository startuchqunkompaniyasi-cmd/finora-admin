/**
 * admin/pages/userDetail.js
 * Bitta foydalanuvchi: profil, tarif, holat, balans (foydalanuvchining OʻZ yozuvlaridan hisoblangan),
 * foydalanish koʻrsatkichlari va soʻnggi tranzaksiyalar (tavsif/izohsiz — maxfiylik).
 * Hisobni toʻxtatish, tarif oʻzgartirish va tahrirlash — server tekshiradi va audit jurnaliga yozadi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { openModal } from '../../components/modal.js';
import { textField, selectField } from '../../components/form/fields.js';
import { SYSTEM_CATEGORIES } from '../../../../shared/constants.js';
import { at } from '../i18n.js';
import { get, post, patch } from '../api.js';
import { fmtDateTime, fmtAgo, fmtNumber, fmtMoney } from '../format.js';
import { pageHeader, card, badge, dataTable, confirmWithReason, attempt, note, emptyBlock } from '../components/ui.js';

export const title = at('adm.nav.users');

const categoryName = (id) => SYSTEM_CATEGORIES.find((c) => c.id === id)?.name ?? id;

export async function render(ctx) {
  const id = ctx.query.get('id');
  if (!id) return h('div', { class: 'adm-page' }, card(null, emptyBlock(at('adm.user.notFound'))));

  let user;
  let tariffs;
  try {
    [{ user }, { tariffs }] = await Promise.all([get(`/users/${encodeURIComponent(id)}`), get('/tariffs')]);
  } catch (error) {
    if (error.status === 404) return h('div', { class: 'adm-page' }, pageHeader(at('adm.nav.users'), null, h('a', { class: 'btn btn--secondary btn--sm', href: '#/admin/users' }, at('adm.back'))), card(null, emptyBlock(at('adm.user.notFound'))));
    throw error;
  }
  const tariffName = (planId) => tariffs.find((x) => x.id === planId)?.name ?? planId;
  const suspended = user.status === 'suspended';

  // ---- amallar ----
  async function toggleStatus() {
    const next = suspended ? 'active' : 'suspended';
    const answer = await confirmWithReason({
      title: suspended ? at('adm.user.reactivateTitle') : at('adm.user.suspendTitle'),
      message: suspended ? at('adm.user.reactivateMsg', { name: user.name }) : at('adm.user.suspendMsg', { name: user.name }),
      confirmLabel: suspended ? at('adm.user.reactivate') : at('adm.user.suspend'),
      tone: suspended ? 'primary' : 'danger',
    });
    if (answer && (await attempt(() => post(`/users/${encodeURIComponent(user.id)}/status`, { status: next, reason: answer.reason }), at('adm.saved')))) ctx.refresh();
  }

  function changePlan() {
    const select = selectField({ name: 'plan', label: at('adm.col.plan'), value: user.plan, options: tariffs.filter((x) => x.isActive || x.id === user.plan).map((x) => ({ value: x.id, label: x.name })) });
    const reason = textField({ name: 'reason', label: at('adm.reason'), hint: at('adm.reasonHint'), multiline: true, maxLength: 500 });
    const save = h('button', { class: 'btn btn--primary', type: 'submit' }, at('adm.save'));
    const modal = openModal({
      title: at('adm.user.changePlan'),
      size: 'sm',
      content: h('form', { class: 'adm-form', novalidate: true, onSubmit: async (event) => {
        event.preventDefault();
        if (select.getValue() === user.plan) return reason.setError(at('adm.user.samePlan'));
        if (reason.getValue().trim().length < 5) return reason.setError(at('adm.reasonShort'));
        save.disabled = true;
        const ok = await attempt(() => post(`/users/${encodeURIComponent(user.id)}/plan`, { plan: select.getValue(), reason: reason.getValue().trim() }), at('adm.saved'));
        if (ok) { modal.close(); ctx.refresh(); } else save.disabled = false;
      } }, h('p', { class: 'modal__description' }, at('adm.user.planNote')), select.element, reason.element, h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, at('adm.cancel')), save)),
    });
  }

  function edit() {
    const name = textField({ name: 'name', label: at('adm.col.name'), value: user.name, maxLength: 80, required: true });
    const email = textField({ name: 'email', label: 'Email', value: user.email, type: 'email', maxLength: 254, required: true });
    const reason = textField({ name: 'reason', label: at('adm.reason'), optional: true, maxLength: 500 });
    const save = h('button', { class: 'btn btn--primary', type: 'submit' }, at('adm.save'));
    const modal = openModal({
      title: at('adm.user.edit'),
      size: 'sm',
      content: h('form', { class: 'adm-form', novalidate: true, onSubmit: async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          await patch(`/users/${encodeURIComponent(user.id)}`, { name: name.getValue(), email: email.getValue(), reason: reason.getValue() });
          modal.close();
          ctx.refresh();
        } catch (error) {
          save.disabled = false;
          (error.field === 'email' ? email : name).setError(error.message);
        }
      } }, name.element, email.element, reason.element, h('p', { class: 'adm-hint' }, at('adm.user.editNote')), h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, at('adm.cancel')), save)),
    });
  }

  // ---- koʻrinish ----
  const kv = (label, value) => h('li', null, h('span', null, label), h('strong', null, value));
  const b = user.balance;

  const profile = card(at('adm.user.profile'), h('ul', { class: 'adm-kv reset-list' },
    kv('ID', h('code', { class: 'adm-code' }, user.id)),
    kv('Email', user.email),
    kv(at('adm.col.plan'), badge(tariffName(user.plan))),
    kv(at('adm.col.status'), badge(at(`adm.status.${user.status}`), suspended ? 'negative' : 'positive')),
    kv(at('adm.col.registered'), fmtDateTime(user.createdAt)),
    kv(at('adm.col.lastActive'), user.lastActiveAt ? `${fmtAgo(user.lastActiveAt)} (${fmtDateTime(user.lastActiveAt)})` : at('adm.never')),
    kv(at('adm.user.currency'), user.baseCurrency),
    kv(at('adm.user.timezone'), user.timezone)
  ));

  const balance = card(at('adm.user.balance'), h('div', null,
    h('p', { class: 'adm-bignum' }, fmtMoney(b.currentMinor, b.currency)),
    h('ul', { class: 'adm-kv reset-list' }, kv(at('adm.user.opening'), fmtMoney(b.openingMinor, b.currency)), kv(at('adm.user.income'), fmtMoney(b.incomeMinor, b.currency)), kv(at('adm.user.expense'), fmtMoney(b.expenseMinor, b.currency))),
    b.unconvertedCount ? note(at('adm.user.unconverted', { n: b.unconvertedCount }), 'warning') : null,
    note(at('adm.user.balanceNote'))
  ));

  const usage = card(at('adm.user.usage'), h('ul', { class: 'adm-kv reset-list' },
    kv(at('adm.user.transactions'), fmtNumber(user.usage.transactions)),
    kv(at('adm.user.budgets'), fmtNumber(user.usage.budgets)),
    kv(at('adm.user.goals'), fmtNumber(user.usage.goals)),
    kv(at('adm.user.sessions'), fmtNumber(user.usage.activeSessions)),
    kv(at('adm.user.onboarded'), user.onboardedAt ? fmtDateTime(user.onboardedAt) : at('adm.no'))
  ));

  const last = card(at('adm.user.lastTx'), dataTable({
    caption: at('adm.user.lastTx'),
    empty: at('adm.noTxYet'),
    rows: user.lastTransactions,
    columns: [
      { key: 'occurredAt', label: at('adm.col.date'), render: (r) => fmtDateTime(r.occurredAt) },
      { key: 'type', label: at('adm.col.type'), render: (r) => badge(at(`adm.type.${r.type}`), r.type === 'income' ? 'positive' : 'negative') },
      { key: 'categoryId', label: at('adm.col.category'), render: (r) => categoryName(r.categoryId) },
      { key: 'amount', label: at('adm.col.amount'), align: 'end', render: (r) => fmtMoney(r.amount, r.currency) },
      { key: 'isDemo', label: '', render: (r) => (r.isDemo ? badge(at('adm.demo'), 'warning') : '') },
    ],
  }), { flush: true });

  return h('div', { class: 'adm-page' },
    pageHeader(user.name, user.email,
      h('a', { class: 'btn btn--secondary btn--sm', href: '#/admin/users' }, icon('chevronLeft', { size: 16 }), at('adm.back')),
      h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: edit }, icon('pencil', { size: 16 }), at('adm.user.edit')),
      h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: changePlan }, icon('crown', { size: 16 }), at('adm.user.changePlan')),
      h('button', { class: ['btn', 'btn--sm', suspended ? 'btn--primary' : 'btn--danger'], type: 'button', onClick: toggleStatus }, suspended ? at('adm.user.reactivate') : at('adm.user.suspend'))),
    suspended ? note(at('adm.user.suspendedNote'), 'warning') : null,
    h('div', { class: 'adm-grid adm-grid--3' }, profile, balance, usage),
    last
  );
}
