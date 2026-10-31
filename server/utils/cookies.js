/**
 * utils/cookies.js
 * Minimal cookie oʻqish/yozish. `cookie-parser` kabi paketga ehtiyoj sezmaydigan darajada
 * sodda format uchun oʻz yordamchimizni yozdik — loyihada faqat bitta cookie (sessiya) ishlatiladi.
 */

/** @returns {Record<string,string>} */
export function parseCookies(header) {
  const result = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    try {
      result[name] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      result[name] = part.slice(eq + 1).trim();
    }
  }
  return result;
}

/**
 * @param {Object} options
 * @param {boolean} [options.httpOnly]
 * @param {'lax'|'strict'|'none'} [options.sameSite]
 * @param {boolean} [options.secure]
 * @param {string} [options.path]
 * @param {number} [options.maxAge]   millisekund
 */
export function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) segments.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`);
  if (options.secure) segments.push('Secure');
  return segments.join('; ');
}

/** Cookie'ni darhol muddati tugagan qilib belgilaydi (oʻchirish uchun). */
export function expireCookie(name, options = {}) {
  return serializeCookie(name, '', { ...options, maxAge: 0 });
}
