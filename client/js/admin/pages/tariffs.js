/**
 * admin/pages/tariffs.js
 * Tariflar: koʻrish, yaratish, tahrirlash (narx, davr, sinov, cheklovlar), faollashtirish/nofaol qilish,
 * narx tarixi. Har oʻzgarish chop etishdan OLDIN koʻrib chiqiladi (oldin → keyin).
 *
 * Mavjud obunachilar qoidasi (aniq): tarif narxi yoki holati oʻzgarishi hech bir foydalanuvchining
 * tarifini jimgina oʻzgartirmaydi. Nofaol tarifdagi foydalanuvchilar oʻz tarifini saqlab qoladi, faqat
 * yangi foydalanuvchilarga taklif qilinmaydi. Foydalanuvchi tarifini faqat admin alohida (sabab bilan) oʻzgartiradi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { openModal } from '../../components/modal.js';
import { textField, selectField } from '../../components/form/fields.js';
import { at } from '../i18n.js';
import { get, post, patch, del } from '../api.js';
import { fmtDateTime, fmtNumber, fmtMoney } from '../format.js';
import { pageHeader, card, badge, dataTable, attempt, note, switchField, confirmWithReason } from '../components/ui.js';

export const title = at('adm.nav.tariffs');

const PERIODS = ['daily', 'monthly', 'yearly'];
const periodLabel = (p) => at(`adm.period.${p}`);
const limitText = (v) => (v === null || v === undefined ? at('adm.unlimited') : fmtNumber(v));

export async function render(ctx) {
  const { tariffs, defaultTariff } = await get('/tariffs');

  const priceText = (tariff) => (tariff.priceMinor === 0 && tariff.id !== 'free' ? at('adm.tariff.noPrice') : tariff.priceMinor === 0 ? at('adm.tariff.free') : `${fmtMoney(tariff.priceMinor, 'UZS')} / ${periodLabel(tariff.billingPeriod).toLowerCase()}`);

  async function showHistory(tariff) {
    let history;
    try { ({ history } = await get(`/tariffs/${encodeURIComponent(tariff.id)}/history`)); } catch (error) { return attempt(() => { throw error; }); }
    openModal({
      title: at('adm.tariff.historyTitle', { name: tariff.name }),
      size: 'lg',
      content: dataTable({
        caption: at('adm.tariff.history'),
        empty: at('adm.tariff.noHistory'),
        rows: history,
        columns: [
          { key: 'createdAt', label: at('adm.col.date'), render: (r) => fmtDateTime(r.createdAt) },
          { key: 'old', label: at('adm.tariff.before'), render: (r) => `${fmtMoney(r.oldPriceMinor ?? 0, 'UZS')} · ${periodLabel(r.oldBillingPeriod ?? 'monthly')}` },
          { key: 'new', label: at('adm.tariff.after'), render: (r) => `${fmtMoney(r.newPriceMinor, 'UZS')} · ${periodLabel(r.newBillingPeriod)}` },
          { key: 'adminUsername', label: at('adm.col.admin') },
          { key: 'reason', label: at('adm.reason'), render: (r) => r.reason ?? '—' },
        ],
      }),
    });
  }

  function openEditor(existing) {
    const isNew = !existing;
    const t0 = existing ?? { id: '', name: '', description: '', priceMinor: 0, billingPeriod: 'monthly', trialDays: 0, limits: { budgets: null, goals: null }, isActive: true, subscribers: 0, isBuiltin: false };

    const f = {
      id: textField({ name: 'id', label: at('adm.tariff.id'), hint: at('adm.tariff.idHint'), value: t0.id, maxLength: 30, required: true }),
      name: textField({ name: 'name', label: at('adm.tariff.name'), value: t0.name, maxLength: 40, required: true }),
      description: textField({ name: 'description', label: at('adm.tariff.description'), value: t0.description, multiline: true, maxLength: 200, optional: true }),
      price: textField({ name: 'price', label: at('adm.tariff.price'), hint: at('adm.tariff.priceHint'), value: String(t0.priceMinor / 100), type: 'number', inputMode: 'numeric', attrs: { min: '0', step: '1' } }),
      period: selectField({ name: 'period', label: at('adm.tariff.period'), value: t0.billingPeriod, options: PERIODS.map((p) => ({ value: p, label: periodLabel(p) })) }),
      trial: textField({ name: 'trial', label: at('adm.tariff.trial'), hint: at('adm.tariff.trialHint'), value: String(t0.trialDays), type: 'number', inputMode: 'numeric', attrs: { min: '0', max: '365', step: '1' } }),
      budgets: textField({ name: 'budgets', label: at('adm.tariff.limitBudgets'), hint: at('adm.tariff.limitHint'), value: t0.limits.budgets ?? '', type: 'number', inputMode: 'numeric', attrs: { min: '0', step: '1' }, optional: true }),
      goals: textField({ name: 'goals', label: at('adm.tariff.limitGoals'), hint: at('adm.tariff.limitHint'), value: t0.limits.goals ?? '', type: 'number', inputMode: 'numeric', attrs: { min: '0', step: '1' }, optional: true }),
      active: switchField({ name: 'active', label: at('adm.tariff.active'), hint: at('adm.tariff.activeHint'), checked: t0.isActive }),
      reason: textField({ name: 'reason', label: at('adm.reason'), hint: at('adm.tariff.reasonHint'), multiline: true, maxLength: 500, optional: true }),
    };

    const body = h('div');
    let modal;

    const intOrNull = (text) => (String(text).trim() === '' ? null : Number(text));

    function readForm() {
      let ok = true;
      const err = (field, message) => { f[field].setError(message); ok = false; };
      const price = Number(f.price.getValue());
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) err('price', at('adm.tariff.errPrice'));
      const trial = Number(f.trial.getValue() || 0);
      if (!Number.isInteger(trial) || trial < 0 || trial > 365) err('trial', at('adm.tariff.errTrial'));
      const name = f.name.getValue().trim();
      if (name.length < 2) err('name', at('adm.tariff.errName'));
      const lim = (key) => { const v = intOrNull(f[key].getValue()); if (v !== null && (!Number.isInteger(v) || v < 0)) { err(key, at('adm.tariff.errLimit')); } return v; };
      const limits = { budgets: lim('budgets'), goals: lim('goals') };
      if (isNew && !/^[a-z][a-z0-9-]{1,29}$/.test(f.id.getValue().trim().toLowerCase())) err('id', at('adm.tariff.errId'));
      if (!ok) return null;
      return { id: f.id.getValue().trim().toLowerCase(), name, description: f.description.getValue().trim(), priceMinor: price * 100, billingPeriod: f.period.getValue(), trialDays: trial, limits, isActive: f.active.getValue() };
    }

    function diff(next) {
      const rows = [];
      const push = (label, before, after) => { if (String(before) !== String(after)) rows.push({ label, before, after }); };
      push(at('adm.tariff.name'), t0.name, next.name);
      push(at('adm.tariff.description'), t0.description || '—', next.description || '—');
      push(at('adm.tariff.price'), fmtMoney(t0.priceMinor, 'UZS'), fmtMoney(next.priceMinor, 'UZS'));
      push(at('adm.tariff.period'), periodLabel(t0.billingPeriod), periodLabel(next.billingPeriod));
      push(at('adm.tariff.trial'), t0.trialDays, next.trialDays);
      push(at('adm.tariff.limitBudgets'), limitText(t0.limits.budgets), limitText(next.limits.budgets));
      push(at('adm.tariff.limitGoals'), limitText(t0.limits.goals), limitText(next.limits.goals));
      push(at('adm.tariff.active'), t0.isActive ? at('adm.yes') : at('adm.no'), next.isActive ? at('adm.yes') : at('adm.no'));
      return rows;
    }

    function showForm() {
      body.replaceChildren(h('form', { class: 'adm-form', novalidate: true, onSubmit: (event) => { event.preventDefault(); showPreview(); } },
        isNew ? f.id.element : h('p', { class: 'adm-hint' }, `ID: ${t0.id}`),
        f.name.element, f.description.element,
        h('div', { class: 'form__row' }, f.price.element, f.period.element),
        f.trial.element,
        h('div', { class: 'form__row' }, f.budgets.element, f.goals.element),
        f.active.element,
        !isNew && t0.subscribers ? note(at('adm.tariff.subscribersNote', { n: t0.subscribers }), 'info') : null,
        f.reason.element,
        h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, at('adm.cancel')), h('button', { class: 'btn btn--primary', type: 'submit' }, icon('check', { size: 16 }), at('adm.tariff.preview')))));
    }

    function showPreview() {
      const next = readForm();
      if (!next) return;
      const changes = isNew ? [] : diff(next);
      const priceChanged = !isNew && (next.priceMinor !== t0.priceMinor || next.billingPeriod !== t0.billingPeriod);
      const deactivating = !isNew && t0.isActive && !next.isActive;
      const reasonNeeded = priceChanged || deactivating;
      const reason = f.reason.getValue().trim();
      if (reasonNeeded && reason.length < 5) { showForm(); f.reason.setError(at('adm.reasonShort')); return; }
      if (!isNew && changes.length === 0) { modal.close(); return; }

      const publish = h('button', { class: 'btn btn--primary', type: 'button' }, isNew ? at('adm.tariff.create') : at('adm.tariff.publish'));
      publish.addEventListener('click', async () => {
        publish.disabled = true;
        const ok = await attempt(() => (isNew
          ? post('/tariffs', next)
          : patch(`/tariffs/${encodeURIComponent(t0.id)}`, { name: next.name, description: next.description, priceMinor: next.priceMinor, billingPeriod: next.billingPeriod, trialDays: next.trialDays, limits: next.limits, isActive: next.isActive, reason, confirm: deactivating ? true : undefined })), at('adm.saved'));
        if (ok) { modal.close(); ctx.refresh(); } else publish.disabled = false;
      });

      body.replaceChildren(h('div', { class: 'adm-form' },
        h('h3', { class: 'adm-subtitle' }, at('adm.tariff.previewTitle')),
        isNew
          ? h('ul', { class: 'adm-kv reset-list' }, [[at('adm.tariff.name'), next.name], [at('adm.tariff.price'), fmtMoney(next.priceMinor, 'UZS')], [at('adm.tariff.period'), periodLabel(next.billingPeriod)], [at('adm.tariff.active'), next.isActive ? at('adm.yes') : at('adm.no')]].map(([k, v]) => h('li', null, h('span', null, k), h('strong', null, v))))
          : dataTable({ caption: at('adm.tariff.previewTitle'), rows: changes, columns: [{ key: 'label', label: at('adm.tariff.field') }, { key: 'before', label: at('adm.tariff.before') }, { key: 'after', label: at('adm.tariff.after'), render: (r) => h('strong', null, r.after) }] }),
        !isNew ? note(at('adm.tariff.existingRule', { n: t0.subscribers }), 'info') : null,
        deactivating && t0.subscribers ? note(at('adm.tariff.deactivateWarn', { n: t0.subscribers }), 'warning') : null,
        h('div', { class: 'modal__actions' }, h('button', { class: 'btn btn--secondary', type: 'button', onClick: showForm }, icon('chevronLeft', { size: 16 }), at('adm.back')), publish)));
    }

    showForm();
    modal = openModal({ title: isNew ? at('adm.tariff.new') : at('adm.tariff.editTitle', { name: t0.name }), size: 'md', content: body });
  }

  async function remove(tariff) {
    const answer = await confirmWithReason({ title: at('adm.tariff.deleteTitle'), message: at('adm.tariff.deleteMsg', { name: tariff.name }), confirmLabel: at('adm.delete') });
    if (answer && (await attempt(() => del(`/tariffs/${encodeURIComponent(tariff.id)}`, { reason: answer.reason }), at('adm.saved')))) ctx.refresh();
  }

  const cards = tariffs.map((tariff) =>
    h('article', { class: ['adm-card', 'adm-tariff', !tariff.isActive && 'is-inactive'], 'aria-labelledby': `tariff-${tariff.id}` },
      h('header', { class: 'adm-tariff__head' },
        h('div', null, h('h2', { class: 'adm-card__title', id: `tariff-${tariff.id}` }, tariff.name), h('code', { class: 'adm-code' }, tariff.id)),
        h('div', { class: 'adm-tariff__badges' }, badge(tariff.isActive ? at('adm.status.active') : at('adm.tariff.inactive'), tariff.isActive ? 'positive' : 'neutral'), tariff.id === defaultTariff ? badge(at('adm.tariff.default'), 'info') : null, tariff.isBuiltin ? badge(at('adm.tariff.builtin')) : null)),
      h('p', { class: 'adm-tariff__price' }, priceText(tariff)),
      tariff.description ? h('p', { class: 'adm-tariff__desc' }, tariff.description) : null,
      h('ul', { class: 'adm-kv reset-list' },
        h('li', null, h('span', null, at('adm.tariff.subscribers')), h('strong', null, fmtNumber(tariff.subscribers))),
        h('li', null, h('span', null, at('adm.tariff.trial')), h('strong', null, tariff.trialDays ? at('adm.days', { n: tariff.trialDays }) : at('adm.no'))),
        h('li', null, h('span', null, at('adm.tariff.limitBudgets')), h('strong', null, limitText(tariff.limits.budgets))),
        h('li', null, h('span', null, at('adm.tariff.limitGoals')), h('strong', null, limitText(tariff.limits.goals)))),
      h('footer', { class: 'adm-tariff__actions' },
        h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => openEditor(tariff) }, icon('pencil', { size: 16 }), at('adm.edit')),
        h('button', { class: 'btn btn--secondary btn--sm', type: 'button', onClick: () => showHistory(tariff) }, icon('clock', { size: 16 }), at('adm.tariff.history')),
        !tariff.isBuiltin && !tariff.subscribers ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => remove(tariff) }, icon('trash', { size: 16 }), at('adm.delete')) : null))
  );

  const unpriced = tariffs.some((x) => x.id !== 'free' && x.priceMinor === 0);
  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.tariffs'), at('adm.tariff.subtitle'), h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openEditor(null) }, icon('plus', { size: 16 }), at('adm.tariff.new'))),
    unpriced ? note(at('adm.tariff.unpricedNote'), 'warning') : null,
    h('div', { class: 'adm-grid adm-grid--3' }, cards),
    note(at('adm.tariff.rule')),
    note(at('adm.tariff.appNote'))
  );
}
