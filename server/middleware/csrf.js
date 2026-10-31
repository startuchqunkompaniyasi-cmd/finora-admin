/**
 * server/middleware/csrf.js
 * "Double-submit cookie" CSRF himoyasi: sessiya cookie'si SameSite=Lax boʻlgani uchun
 * allaqachon yaxshi himoyalangan, lekin bu qoʻshimcha qatlam (defense-in-depth) sifatida
 * qoʻshiladi. Mijoz `finora_csrf` cookie'sidagi tokenni `X-CSRF-Token` sarlavhasida qaytarishi
 * shart — faqat shu holatda soʻrov haqiqiy sahifadan kelganiga ishonch hosil qilinadi.
 */

import crypto from 'node:crypto';
import { parseCookies, serializeCookie } from '../utils/cookies.js';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = 'finora_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cookie mavjud boʻlmasa, yangi token yaratib oʻrnatadi. Har bir soʻrovda ishlaydi. */
export function ensureCsrfCookie(req, res, next) {
  const existing = parseCookies(req.headers.cookie)[CSRF_COOKIE_NAME];
  if (!existing) {
    const token = crypto.randomBytes(24).toString('hex');
    res.setHeader(
      'Set-Cookie',
      serializeCookie(CSRF_COOKIE_NAME, token, {
        path: '/',
        sameSite: 'lax',
        secure: env.auth.cookieSecure,
        // E'tibor bering: httpOnly YO'Q — JS bu tokenni o'qib, so'rov sarlavhasiga qo'yishi kerak.
      }),
    );
    req.csrfToken = token;
  } else {
    req.csrfToken = existing;
  }
  next();
}

/** O'zgaruvchi (mutating) metodlar uchun tokenni tekshiradi. */
export function verifyCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = parseCookies(req.headers.cookie)[CSRF_COOKIE_NAME] || '';
  const headerToken = req.headers[CSRF_HEADER_NAME] || '';

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(String(headerToken));

  const valid =
    cookieBuf.length > 0 &&
    cookieBuf.length === headerBuf.length &&
    crypto.timingSafeEqual(cookieBuf, headerBuf);

  if (!valid) {
    return res.status(403).json({
      error: { code: 'CSRF_INVALID', message: "Soʻrov tasdiqlanmadi. Sahifani yangilab, qayta urinib koʻring." },
    });
  }
  next();
}
