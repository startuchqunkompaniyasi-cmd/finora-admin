/**
 * admin/secretTrigger.js
 * Logotipni ketma-ket 5 marta bosish (sichqoncha yoki sensorli ekran) admin KIRISH oynasini ochadi.
 *
 * MUHIM: bu faqat qulaylik, XAVFSIZLIK EMAS. Kirish oynasining oʻzi hamma uchun ochiq manzil
 * (#/admin/login) boʻlib, haqiqiy himoya serverdagi autentifikatsiya va avtorizatsiyada.
 * Hisoblagich bosishlar orasida `resetMs` dan koʻproq tanaffus boʻlsa nolga tushadi.
 */

export const SECRET_CLICKS = 5;
export const SECRET_RESET_MS = 900;

/** Sof hisoblagich (testlash oson): har bosishda `press(now)` chaqiriladi, 5-sida true qaytaradi. */
export function createClickCounter({ target = SECRET_CLICKS, resetMs = SECRET_RESET_MS } = {}) {
  let count = 0;
  let last = 0;
  return {
    press(now = Date.now()) {
      count = now - last > resetMs ? 1 : count + 1;
      last = now;
      if (count >= target) {
        count = 0;
        return true;
      }
      return false;
    },
    reset() { count = 0; last = 0; },
  };
}

/**
 * `element` (logotip) ga ulaydi. `click` hodisasi sichqoncha, sensor va klaviatura (Enter) uchun
 * bir xil ishlaydi, shuning uchun alohida touch handler kerak emas (va bosish ikki marta sanalmaydi).
 */
export function attachSecretTrigger(element, onUnlock) {
  const counter = createClickCounter();
  element.addEventListener('click', (event) => {
    if (counter.press()) {
      event.preventDefault(); // 5-bosish havolaning oddiy yoʻnaltirishini bekor qiladi
      onUnlock();
    }
  });
}

export function openAdminLogin() {
  location.hash = '#/admin/login';
}
