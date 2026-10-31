/**
 * server/middleware/rateLimit.js
 * Juda sodda xotiradagi ("in-memory") tezlik cheklovchi. Faqat login/registratsiya kabi
 * hujumga ochiq endpointlar uchun ishlatiladi — butun ilova uchun emas. Alohida npm
 * paketiga ehtiyoj sezilmadi: mantiq bir nechta qatordan iborat va sinovi oson.
 *
 * Eslatma: bu yechim bitta jarayon (process) doirasida ishlaydi. Koʻp nusxali (horizontal
 * scaled) joylashtirish uchun Redis kabi umumiy xotira kerak boʻladi — docs/ARCHITECTURE.md
 * da qayd etilgan.
 */

/** @type {Map<string, number[]>} key -> so'rov vaqtlari (ms) */
let hits = new Map();

/**
 * @param {Object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {(req: import('express').Request) => string} [options.keyFn]
 * @param {string} [options.message]
 */
export function createRateLimiter({ windowMs, max, keyFn = (req) => req.ip, message }) {
  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= max) {
      const retryAfterMs = timestamps[0] + windowMs - now;
      res.setHeader('Retry-After', Math.max(1, Math.ceil(retryAfterMs / 1000)));
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: message || "Juda koʻp urinish boʻldi. Birozdan soʻng qayta urinib koʻring.",
        },
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
}

/** Faqat testlar uchun: jarayonlar orasidagi xotirani tozalaydi. */
export function __resetRateLimiterStateForTests() {
  hits = new Map();
}
