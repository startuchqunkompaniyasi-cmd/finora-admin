/**
 * tests/server/helpers/httpClient.js
 * Haqiqiy brauzerga oʻxshab ishlaydigan kichik test mijozi: sessiya VA CSRF cookie'larini
 * avtomatik eslab qoladi ("cookie jar") va o'zgaruvchi (POST/PATCH/DELETE) soʻrovlarga
 * `X-CSRF-Token` sarlavhasini oʻzi qoʻshadi — xuddi `client/js/utils/csrf.js` qiladigani kabi.
 * Shu tufayli testlar CSRF himoyasini qoʻlda aylanib oʻtishga majbur boʻlmaydi.
 */

const CSRF_COOKIE_NAME = 'finora_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createHttpClient(baseUrl) {
  /** @type {Record<string,string>} */
  let cookies = {};

  function cookieHeader() {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  function absorbSetCookie(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const entry of raw) {
      const [pair, ...attrs] = entry.split(';');
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /max-age\s*=\s*0/i.test(a.trim()));
      if (expired) delete cookies[name];
      else cookies[name] = value;
    }
  }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const cookieStr = cookieHeader();
    if (cookieStr) headers.Cookie = cookieStr;
    if (!SAFE_METHODS.has(method) && cookies[CSRF_COOKIE_NAME]) {
      headers['X-CSRF-Token'] = cookies[CSRF_COOKIE_NAME];
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    absorbSetCookie(response);
    return response;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body = {}) => request('POST', path, body),
    patch: (path, body = {}) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    /** Xom (raw) fetch — masalan CSRF sarlavhasisiz soʻrov yuborishni atayin sinash uchun. */
    rawFetch: (path, options) => fetch(`${baseUrl}${path}`, options).then((res) => { absorbSetCookie(res); return res; }),
    hasCookie: (name) => name in cookies,
    getCookie: (name) => cookies[name],
    clearCookies: () => { cookies = {}; },
  };
}
