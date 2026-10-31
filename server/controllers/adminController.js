/**
 * controllers/adminController.js
 * Admin API uchun "ulash nuqtasi": haqiqiy bazaga ulanadi va `createAdminHandlers` ni quradi
 * (authController.js bilan bir xil naqsh). Testlar bu faylni emas, fabrikani ishlatadi.
 */

import { getDb } from '../database/db.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { createAdminAuthService, bootstrapAdmin } from '../services/adminAuthService.js';
import { createAdminsRepository } from '../repositories/adminsRepository.js';
import { createAuditRepository } from '../repositories/auditRepository.js';
import { createAdminDataRepository } from '../repositories/adminDataRepository.js';
import { createTariffsRepository } from '../repositories/tariffsRepository.js';
import { createSettingsRepository } from '../repositories/settingsRepository.js';
import { createAdminHandlers } from './adminHandlers.js';
import { createAdminMiddleware } from '../middleware/adminAuth.js';

const db = getDb();
export const adminsRepository = createAdminsRepository(db);
export const settingsRepository = createSettingsRepository(db);
const tariffsRepository = createTariffsRepository(db);
tariffsRepository.ensureSeeded();

export const adminAuthService = createAdminAuthService({ adminsRepository, hashPassword, verifyPassword, config: env.admin });

export const adminHandlers = createAdminHandlers({
  adminsRepository,
  auditRepository: createAuditRepository(db),
  dataRepository: createAdminDataRepository(db),
  tariffsRepository,
  settingsRepository,
  adminAuthService,
  cookieConfig: { secure: env.auth.cookieSecure, ttlMs: env.admin.sessionTtlHours * 3_600_000 },
});

export const adminMiddleware = createAdminMiddleware({ adminAuthService, enforcePasswordChange: env.isProduction });

/** Server ishga tushganda chaqiriladi (server.js). Xatosi serverni toʻxtatmaydi. */
export async function initAdmin() {
  try {
    await bootstrapAdmin({ adminsRepository, hashPassword, adminEnv: env.admin, isProduction: env.isProduction });
  } catch (error) {
    console.error('[finora] Admin yaratishda xato:', error.message);
  }
}
