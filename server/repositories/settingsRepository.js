/**
 * repositories/settingsRepository.js
 * `site_settings`: kalit -> JSON qiymat. Faqat SETTING_DEFS dagi kalitlar oʻqiladi/yoziladi;
 * har birining turi, chegarasi va "jamoatga ochiqmi" belgisi bor. Shu roʻyxat tashqarisidagi
 * kalitni saqlab boʻlmaydi — admin API orqali ixtiyoriy narsa yozib qoʻyilmaydi.
 */

export const SETTING_DEFS = Object.freeze({
  siteName: { type: 'string', max: 40, default: 'Finora', public: true },
  siteDescription: { type: 'string', max: 200, default: 'Pulingizni nazorat qiling, xarajatlaringizni tushuning.', public: true },
  maintenanceMode: { type: 'boolean', default: false, public: true },
  maintenanceMessage: { type: 'string', max: 300, default: 'Texnik ishlar olib borilmoqda. Tez orada qaytamiz.', public: true },
  registrationEnabled: { type: 'boolean', default: true, public: true },
  announcementEnabled: { type: 'boolean', default: false, public: true },
  announcementText: { type: 'string', max: 300, default: '', public: true },
  defaultTariff: { type: 'string', max: 40, default: 'free', public: false },
  termsContent: { type: 'text', max: 20000, default: '', public: true },
  privacyContent: { type: 'text', max: 20000, default: '', public: true },
});

export function validateSettingValue(key, value) {
  const def = SETTING_DEFS[key];
  if (!def) return { ok: false, message: 'Nomaʼlum sozlama.' };
  if (def.type === 'boolean') return typeof value === 'boolean' ? { ok: true, value } : { ok: false, message: 'Qiymat ha/yoʻq boʻlishi kerak.' };
  if (typeof value !== 'string') return { ok: false, message: 'Qiymat matn boʻlishi kerak.' };
  const trimmed = value.trim();
  if (trimmed.length > def.max) return { ok: false, message: `Matn ${def.max} belgidan oshmasligi kerak.` };
  if (key === 'siteName' && trimmed.length < 2) return { ok: false, message: 'Sayt nomi kamida 2 belgi boʻlishi kerak.' };
  return { ok: true, value: trimmed };
}

export function createSettingsRepository(db) {
  const readAll = () => {
    const stored = Object.fromEntries(db.prepare('SELECT key, value FROM site_settings').all().map((row) => [row.key, row.value]));
    const out = {};
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      try {
        out[key] = key in stored ? JSON.parse(stored[key]) : def.default;
      } catch {
        out[key] = def.default;
      }
    }
    return out;
  };

  return {
    getAll: readAll,
    getPublic() {
      const all = readAll();
      return Object.fromEntries(Object.entries(SETTING_DEFS).filter(([, def]) => def.public).map(([key]) => [key, all[key]]));
    },
    get: (key) => readAll()[key],
    /** @param {Record<string, unknown>} patch  allaqachon validatsiyadan oʻtgan qiymatlar */
    set(patch, adminUsername) {
      const stamp = new Date().toISOString();
      const upsert = db.prepare('INSERT INTO site_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by');
      db.exec('BEGIN');
      try {
        for (const [key, value] of Object.entries(patch)) upsert.run(key, JSON.stringify(value), stamp, adminUsername);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return readAll();
    },
  };
}
