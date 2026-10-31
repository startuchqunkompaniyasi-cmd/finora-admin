/**
 * controllers/authController.js
 * Bu — haqiqiy ilova uchun "ulash nuqtasi": shu yerda birinchi marta haqiqiy bazaga ulanadi
 * (`getDb()`) va repository/servis nusxalarini quradi. Testlar bu faylni EMAS, balki
 * `createUsersRepository`/`createSessionsRepository`/`createSessionService` fabrikalarini
 * oʻz vaqtinchalik bazasi bilan toʻgʻridan-toʻgʻri ishlatadi — shuning uchun bu yerdagi
 * eager (importda darhol) haqiqiy bazaga ulanish testlarga hech qanday taʼsir qilmaydi.
 */

import { validateRegisterDraft, validateLoginDraft, firstError } from '../../shared/validators.js';
import { getDb } from '../database/db.js';
import { createUsersRepository } from '../repositories/usersRepository.js';
import { createSessionsRepository } from '../repositories/sessionsRepository.js';
import { createSessionService, SESSION_COOKIE_NAME } from '../services/sessionService.js';
export { SESSION_COOKIE_NAME };
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { serializeCookie, expireCookie } from '../utils/cookies.js';
import { env } from '../config/env.js';
import { createSettingsRepository } from '../repositories/settingsRepository.js';

const usersRepository = createUsersRepository(getDb());
const sessionsRepository = createSessionsRepository(getDb());
const settingsRepository = createSettingsRepository(getDb()); // ADMIN: ro'yxatdan o'tish yoqilganmi, standart tarif
const sessionService = createSessionService({ sessionsRepository, sessionTtlDays: env.auth.sessionTtlDays, cookieSecure: env.auth.cookieSecure });

export { sessionService }; // middleware/auth.js shu bilan bir xil (getDb() keshlangani uchun) nusxani ishlatadi

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, token, sessionService.cookieOptions()));
}

export async function register(req, res, next) {
  try {
    if (!settingsRepository.get('registrationEnabled')) {
      return res.status(403).json({ error: { code: 'REGISTRATION_CLOSED', message: 'Hozircha roʻyxatdan oʻtish yopiq.' } });
    }
    const result = validateRegisterDraft(req.body ?? {});
    if (!result.ok) {
      const first = firstError(result.errors);
      return res.status(422).json({ error: { code: 'VALIDATION', message: first.message, field: first.field, errors: result.errors } });
    }

    if (usersRepository.findByEmailRaw(result.value.email)) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Bu email allaqachon roʻyxatdan oʻtgan.', field: 'email' } });
    }

    const passwordHash = await hashPassword(result.value.password);
    const user = usersRepository.create({ name: result.value.name, email: result.value.email, passwordHash });
    const defaultTariff = settingsRepository.get('defaultTariff');
    if (defaultTariff && defaultTariff !== 'free') usersRepository.updateSettings(user.id, { plan: defaultTariff });
    const { token } = sessionService.createSession(user.id, req.headers['user-agent']);
    setSessionCookie(res, token);

    res.status(201).json({ data: { user } });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = validateLoginDraft(req.body ?? {});
    if (!result.ok) {
      const first = firstError(result.errors);
      return res.status(422).json({ error: { code: 'VALIDATION', message: first.message, field: first.field, errors: result.errors } });
    }

    const row = usersRepository.findByEmailRaw(result.value.email);
    // Email topilmadimi yoki parol notoʻgʻrimi — ataylab bir xil xabar (foydalanuvchi mavjudligini bilib olishning oldini olish uchun).
    const genericError = () => res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email yoki parol notoʻgʻri.' } });

    if (!row) return genericError();
    if (!(await verifyPassword(result.value.password, row.password_hash))) return genericError();
    if (row.status === 'suspended') {
      return res.status(403).json({ error: { code: 'ACCOUNT_SUSPENDED', message: 'Hisobingiz vaqtincha toʻxtatilgan. Yordam xizmatiga murojaat qiling.' } });
    }

    const { token } = sessionService.createSession(row.id, req.headers['user-agent']);
    setSessionCookie(res, token);
    res.json({ data: { user: usersRepository.findById(row.id) } });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  sessionService.destroySession(req.sessionToken);
  res.setHeader('Set-Cookie', expireCookie(SESSION_COOKIE_NAME, { path: '/' }));
  res.json({ data: { ok: true } });
}

export function me(req, res) {
  sessionService.deleteExpiredSessions();
  res.json({ data: { user: req.userId ? usersRepository.findById(req.userId) : null } });
}
