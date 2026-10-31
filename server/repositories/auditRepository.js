/**
 * repositories/auditRepository.js
 * Append-only audit jurnali. Bu yerda UPDATE/DELETE metodi YOʻQ, bazadagi triggerlar ham ularni
 * taqiqlaydi (0003_admin.sql). `details` ga parol, token yoki xesh hech qachon yozilmaydi:
 * `sanitizeDetails` shunday kalitlarni avtomatik olib tashlaydi (ikkinchi himoya qatlami).
 */

const SECRET_KEY = /pass|token|secret|hash|cookie|authorization/i;

export function sanitizeDetails(value, depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeDetails(item, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = sanitizeDetails(val, depth + 1);
  }
  return out;
}

export function createAuditRepository(db) {
  return {
    /**
     * @param {{admin:{id:string|null, username:string}, action:string, entityType?:string, entityId?:string,
     *          reason?:string, result?:'success'|'failure', details?:object, ip?:string}} entry
     */
    append({ admin, action, entityType = null, entityId = null, reason = null, result = 'success', details = null, ip = null }) {
      db.prepare('INSERT INTO audit_log (admin_id, admin_username, action, entity_type, entity_id, reason, result, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        admin?.id ?? null,
        admin?.username ?? 'unknown',
        action,
        entityType,
        entityId === null ? null : String(entityId),
        reason ? String(reason).slice(0, 500) : null,
        result,
        details ? JSON.stringify(sanitizeDetails(details)) : null,
        ip,
        new Date().toISOString()
      );
    },

    list({ action, page = 1, pageSize = 25 } = {}) {
      const where = action ? 'WHERE action = ?' : '';
      const args = action ? [action] : [];
      const total = db.prepare(`SELECT count(*) AS n FROM audit_log ${where}`).get(...args).n;
      const rows = db.prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize);
      return {
        total,
        items: rows.map((row) => ({
          id: row.id,
          adminUsername: row.admin_username,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          reason: row.reason,
          result: row.result,
          details: row.details ? JSON.parse(row.details) : null,
          createdAt: row.created_at,
        })),
      };
    },

    recent: (limit = 8) => createAuditRepository(db).list({ page: 1, pageSize: limit }).items,
  };
}
