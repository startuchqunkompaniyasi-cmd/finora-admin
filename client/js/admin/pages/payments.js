/**
 * admin/pages/payments.js
 * "Toʻlovlar": FINORA hozircha toʻlov tizimiga ega EMAS (7B-bosqich rejada), shuning uchun bu yerda
 * toʻlov yozuvlari, qaytarishlar yoki balans tuzatishlari YOʻQ va toʻqib chiqarilmaydi.
 * Mavjud haqiqiy maʼlumot — foydalanuvchilarning shaxsiy daromad/xarajat yozuvlari — faqat OʻQISH rejimida
 * koʻrsatiladi (tavsif va izohsiz). Admin ularni oʻzgartira olmaydi: bu foydalanuvchining shaxsiy hisobi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { selectField, textField } from '../../components/form/fields.js';
import { SYSTEM_CATEGORIES } from '../../../../shared/constants.js';
import { at } from '../i18n.js';
import { get } from '../api.js';
import { fmtDateTime, fmtMoney, fmtNumber } from '../format.js';
import { pageHeader, card, badge, dataTable, pagination, debounce, loadingBlock, note } from '../components/ui.js';

export const title = at('adm.nav.payments');
const categoryName = (id) => SYSTEM_CATEGORIES.find((c) => c.id === id)?.name ?? id;

export async function render(ctx) {
  const q = ctx.query;
  const state = { q: q.get('q') ?? '', id: q.get('id') ?? '', type: q.get('type') ?? '', currency: q.get('currency') ?? '', from: q.get('from') ?? '', to: q.get('to') ?? '', page: Number(q.get('page')) || 1 };

  const search = textField({ name: 'q', label: at('adm.pay.user'), hideLabel: true, placeholder: at('adm.pay.userPlaceholder'), value: state.q, maxLength: 80 });
  const txId = textField({ name: 'id', label: at('adm.pay.txId'), hideLabel: true, placeholder: at('adm.pay.txId'), value: state.id, maxLength: 60 });
  const type = selectField({ name: 'type', label: at('adm.col.type'), hideLabel: true, value: state.type, options: [{ value: '', label: at('adm.pay.allTypes') }, { value: 'income', label: at('adm.type.income') }, { value: 'expense', label: at('adm.type.expense') }] });
  const currency = selectField({ name: 'currency', label: at('adm.user.currency'), hideLabel: true, value: state.currency, options: [{ value: '', label: at('adm.pay.allCurrencies') }, { value: 'UZS', label: 'UZS' }, { value: 'USD', label: 'USD' }] });
  const from = h('input', { class: 'input', type: 'date', value: state.from, 'aria-label': at('adm.from') });
  const to = h('input', { class: 'input', type: 'date', value: state.to, 'aria-label': at('adm.to') });
  const results = h('div', { class: 'adm-results', 'aria-live': 'polite' });

  async function load() {
    ctx.setQuery({ ...state, page: state.page > 1 ? state.page : '' });
    results.replaceChildren(loadingBlock());
    try {
      const data = await get('/transactions', { ...state, pageSize: 25 });
      if (ctx.signal.aborted) return;
      const totals = data.totals.length
        ? h('ul', { class: 'adm-kv adm-kv--row reset-list' }, data.totals.map((x) => h('li', null, h('span', null, `${at(`adm.type.${x.type}`)} · ${x.currency} (${fmtNumber(x.count)})`), h('strong', null, fmtMoney(x.sumMinor, x.currency)))))
        : null;
      results.replaceChildren(totals,
        dataTable({
          caption: at('adm.pay.tableTitle'), empty: at('adm.pay.none'), rows: data.items,
          columns: [
            { key: 'occurredAt', label: at('adm.col.date'), render: (r) => fmtDateTime(r.occurredAt) },
            { key: 'userName', label: at('adm.col.user'), render: (r) => h('a', { class: 'adm-link', href: `#/admin/user?id=${encodeURIComponent(r.userId)}` }, r.userName) },
            { key: 'type', label: at('adm.col.type'), render: (r) => badge(at(`adm.type.${r.type}`), r.type === 'income' ? 'positive' : 'negative') },
            { key: 'categoryId', label: at('adm.col.category'), render: (r) => categoryName(r.categoryId) },
            { key: 'amount', label: at('adm.col.amount'), align: 'end', render: (r) => fmtMoney(r.amount, r.currency) },
            { key: 'id', label: 'ID', render: (r) => h('code', { class: 'adm-code' }, r.id.slice(0, 8)) },
          ],
        }),
        pagination({ page: data.page, pageSize: data.pageSize, total: data.total, onChange: (n) => { state.page = n; load(); } }));
    } catch (error) {
      if (!ctx.signal.aborted) results.replaceChildren(note(error.message, 'error'));
    }
  }
  const apply = () => { state.page = 1; load(); };
  search.control.addEventListener('input', debounce(() => { state.q = search.getValue().trim(); apply(); }));
  txId.control.addEventListener('input', debounce(() => { state.id = txId.getValue().trim(); apply(); }));
  type.control.addEventListener('change', () => { state.type = type.getValue(); apply(); });
  currency.control.addEventListener('change', () => { state.currency = currency.getValue(); apply(); });
  from.addEventListener('change', () => { state.from = from.value; apply(); });
  to.addEventListener('change', () => { state.to = to.value; apply(); });

  load();
  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.payments'), at('adm.pay.subtitle')),
    card(at('adm.pay.noSystemTitle'), h('div', null, note(at('adm.pay.noSystem'), 'warning'), h('ul', { class: 'adm-checklist reset-list' }, ['adm.pay.na1', 'adm.pay.na2', 'adm.pay.na3'].map((k) => h('li', null, icon('x', { size: 16 }), at(k)))))),
    card(at('adm.pay.tableTitle'), h('div', null,
      note(at('adm.pay.readonly')),
      h('div', { class: 'adm-toolbar' }, search.element, txId.element, type.element, currency.element, h('label', { class: 'adm-filters__date' }, h('span', null, at('adm.from')), from), h('label', { class: 'adm-filters__date' }, h('span', null, at('adm.to')), to)),
      results))
  );
}
