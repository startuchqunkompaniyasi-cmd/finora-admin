/**
 * admin/pages/settings.js
 * Sayt sozlamalari. Faqat ilovaga HAQIQATAN ulangan sozlamalar bor: sayt nomi/tavsifi, texnik ishlar rejimi,
 * roʻyxatdan oʻtish, eʼlon, standart tarif, shartlar/maxfiylik matni. Ulanmagan narsalar (email, logotip,
 * brend ranglari, funksiya yoqish) ataylab koʻrsatilmaydi va quyida ochiq aytiladi.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { textField, selectField } from '../../components/form/fields.js';
import { at } from '../i18n.js';
import { get, patch } from '../api.js';
import { card, pageHeader, attempt, note, switchField } from '../components/ui.js';
import { confirmDialog } from '../../components/confirmDialog.js';

export const title = at('adm.nav.settings');

export async function render(ctx) {
  const { settings: s, tariffs } = await get('/settings');

  function section(heading, hint, controls, keys, collect) {
    const save = h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, icon('check', { size: 16 }), at('adm.save'));
    const form = h('form', { class: 'adm-form', novalidate: true, onSubmit: async (event) => {
      event.preventDefault();
      const payload = collect();
      if (payload.maintenanceMode === true && !s.maintenanceMode && !(await confirmDialog({ title: at('adm.set.maintConfirmTitle'), message: at('adm.set.maintConfirm'), confirmLabel: at('adm.set.maintEnable') }))) return;
      save.disabled = true;
      const ok = await attempt(() => patch('/settings', payload), at('adm.saved'));
      save.disabled = false;
      if (ok) ctx.refresh();
    } }, hint ? h('p', { class: 'adm-hint' }, hint) : null, controls.map((c) => c.element), h('div', { class: 'adm-form__actions' }, save));
    return card(heading, form);
  }

  const siteName = textField({ name: 'siteName', label: at('adm.set.siteName'), value: s.siteName, maxLength: 40, required: true });
  const siteDesc = textField({ name: 'siteDescription', label: at('adm.set.siteDesc'), value: s.siteDescription, multiline: true, maxLength: 200 });
  const maint = switchField({ name: 'maintenanceMode', label: at('adm.set.maintenance'), hint: at('adm.set.maintenanceHint'), checked: s.maintenanceMode });
  const maintMsg = textField({ name: 'maintenanceMessage', label: at('adm.set.maintMsg'), value: s.maintenanceMessage, multiline: true, maxLength: 300 });
  const reg = switchField({ name: 'registrationEnabled', label: at('adm.set.registration'), hint: at('adm.set.registrationHint'), checked: s.registrationEnabled });
  const annOn = switchField({ name: 'announcementEnabled', label: at('adm.set.announce'), hint: at('adm.set.announceHint'), checked: s.announcementEnabled });
  const annText = textField({ name: 'announcementText', label: at('adm.set.announceText'), value: s.announcementText, multiline: true, maxLength: 300 });
  const defTariff = selectField({ name: 'defaultTariff', label: at('adm.set.defaultTariff'), value: s.defaultTariff, options: tariffs.filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name })) });
  const terms = textField({ name: 'termsContent', label: at('adm.set.terms'), value: s.termsContent, multiline: true, rows: 6, maxLength: 20000 });
  const privacy = textField({ name: 'privacyContent', label: at('adm.set.privacy'), value: s.privacyContent, multiline: true, rows: 6, maxLength: 20000 });

  return h('div', { class: 'adm-page' },
    pageHeader(at('adm.nav.settings'), at('adm.set.subtitle')),
    h('div', { class: 'adm-grid adm-grid--2' },
      section(at('adm.set.site'), null, [siteName, siteDesc], [], () => ({ siteName: siteName.getValue(), siteDescription: siteDesc.getValue() })),
      section(at('adm.set.access'), at('adm.set.accessHint'), [maint, maintMsg, reg], [], () => ({ maintenanceMode: maint.getValue(), maintenanceMessage: maintMsg.getValue(), registrationEnabled: reg.getValue() })),
      section(at('adm.set.announcement'), at('adm.set.announcementHint'), [annOn, annText], [], () => ({ announcementEnabled: annOn.getValue(), announcementText: annText.getValue() })),
      section(at('adm.set.defaults'), at('adm.set.defaultsHint'), [defTariff], [], () => ({ defaultTariff: defTariff.getValue() }))),
    section(at('adm.set.legal'), at('adm.set.legalHint'), [terms, privacy], [], () => ({ termsContent: terms.getValue(), privacyContent: privacy.getValue() })),
    note(at('adm.set.unsupported'))
  );
}
