/**
 * services/adminPasswordPolicy.js
 * Admin paroli siyosati (SERVERDA tekshiriladi; klient faqat maslahat koʻrsatadi).
 * Foydalanuvchi parollari (kamida 8 belgi) bundan alohida: adminlar uchun qatʼiyroq.
 */

const COMMON = new Set(['password', 'password123', '123456789012', 'qwertyuiop12', 'administrator', 'admin12345678', 'finora123456', 'uchqun123456', '000000000000', '111111111111']);

/** @returns {string|null} xato matni yoki null (parol yaroqli). */
export function checkAdminPassword(password, { username = '', current = null } = {}) {
  if (typeof password !== 'string') return 'Parol matn boʻlishi kerak.';
  if (password.length < 12) return 'Parol kamida 12 belgidan iborat boʻlishi kerak.';
  if (password.length > 128) return 'Parol 128 belgidan oshmasligi kerak.';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) return 'Parolda kichik harf, bosh harf, raqam va belgidan kamida uchtasi boʻlishi kerak.';
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return 'Bu parol juda oddiy.';
  if (username && lower.includes(String(username).toLowerCase())) return 'Parolda login boʻlmasligi kerak.';
  if (current !== null && password === current) return 'Yangi parol joriy paroldan farq qilishi kerak.';
  return null;
}

export function checkAdminUsername(username) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
    return 'Login 3–32 belgi: lotin harflari, raqamlar, nuqta, tire yoki pastki chiziq.';
  }
  return null;
}
