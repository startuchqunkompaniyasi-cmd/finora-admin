/**
 * client/js/utils/csrf.js
 * Server har bir javobda `finora_csrf` cookie'sini oʻrnatadi (httpOnly EMAS — shuning uchun
 * JS uni oʻqiy oladi). O'zgaruvchi (POST/PATCH/DELETE) soʻrovlarda bu qiymat `X-CSRF-Token`
 * sarlavhasida qaytarilishi kerak, aks holda server 403 qaytaradi (server/middleware/csrf.js).
 */

const CSRF_COOKIE_NAME = 'finora_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', undefined]);

export function getCsrfToken() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * `headers` obyektiga, metod oʻzgaruvchi boʻlsa, CSRF sarlavhasini qoʻshadi.
 * GET kabi xavfsiz metodlar uchun hech narsa qilmaydi (token hali boʻlmasligi mumkin —
 * birinchi soʻrov aynan shu orqali cookie'ni oʻrnatadi).
 */
export function withCsrfHeader(headers = {}, method) {
  const normalized = method ? method.toUpperCase() : undefined;
  if (SAFE_METHODS.has(normalized)) return headers;
  const token = getCsrfToken();
  return token ? { ...headers, [CSRF_HEADER_NAME]: token } : headers;
}
