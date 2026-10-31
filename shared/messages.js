/**
 * shared/messages.js
 * Tekshiruv (validatsiya) xabarlari. Har bir xato KOD bilan ham keladi (masalan "amount.invalid"),
 * shuning uchun kod dasturiy ishlov uchun, matn esa foydalanuvchi uchun.
 * Client ham, server ham shu matnlarni ishlatadi.
 */

export const MESSAGES = Object.freeze({
  'type.invalid': 'Kirim yoki chiqimni tanlang.',
  'currency.invalid': 'Qoʻllab-quvvatlanadigan valyutani tanlang.',
  'currency.rate': 'Valyuta kursini yuklab boʻlmadi.',
  'amount.invalid': 'Iltimos, toʻgʻri summa kiriting.',
  'amount.zero': 'Summa 0 dan katta boʻlishi kerak.',
  'amount.tooLarge': 'Summa juda katta.',
  'category.required': 'Kategoriyani tanlang.',
  'category.unknown': 'Nomaʼlum kategoriya.',
  'category.mismatch': 'Bu kategoriya {type} uchun mos emas.',
  'description.tooLong': 'Tavsif {max} belgidan oshmasin.',
  'note.tooLong': 'Eslatma {max} belgidan oshmasin.',
  'paymentMethod.invalid': 'Toʻlov usulini tanlang.',
  'date.invalid': 'Toʻgʻri sana kiriting.',
  'date.tooOld': 'Bu sana juda eski.',
  'date.future': 'Sana kelajakda boʻlishi mumkin emas.',
  'time.invalid': 'Toʻgʻri vaqt kiriting.',
  'time.future': 'Vaqt kelajakda boʻlishi mumkin emas.',

  'budgetCategory.required': 'Kategoriyani tanlang.',
  'budgetCategory.unknown': 'Nomaʼlum kategoriya.',
  'budgetCategory.notExpense': 'Byudjet faqat xarajat kategoriyalari uchun boʻladi.',
  'budgetCategory.duplicate': 'Bu kategoriya uchun {period} byudjet allaqachon mavjud.',
  'budgetPeriod.invalid': 'Davrni tanlang.',
  'budgetLimit.invalid': 'Iltimos, toʻgʻri limit summasini kiriting.',
  'budgetLimit.zero': 'Limit 0 dan katta boʻlishi kerak.',
  'budgetLimit.tooLarge': 'Limit juda katta.',

  'goalName.required': 'Maqsad nomini kiriting.',
  'goalName.tooLong': 'Nom {max} belgidan oshmasin.',
  'goalTarget.invalid': 'Iltimos, toʻgʻri summa kiriting.',
  'goalTarget.zero': 'Maqsad summasi 0 dan katta boʻlishi kerak.',
  'goalTarget.tooLarge': 'Summa juda katta.',
  'goalCurrent.invalid': 'Iltimos, toʻgʻri summa kiriting.',
  'goalCurrent.tooLarge': 'Summa juda katta.',
  'goalDeadline.invalid': 'Toʻgʻri sana kiriting.',
  'contribution.invalid': 'Iltimos, toʻgʻri summa kiriting.',
  'contribution.zero': 'Summa 0 dan katta boʻlishi kerak.',
  'contribution.tooLarge': 'Summa juda katta.',

  'name.required': 'Ismingizni kiriting.',
  'name.tooLong': 'Ism {max} belgidan oshmasin.',
  'email.required': 'Email manzilini kiriting.',
  'email.invalid': 'Toʻgʻri email manzil kiriting.',
  'email.taken': 'Bu email allaqachon roʻyxatdan oʻtgan.',
  'password.required': 'Parolni kiriting.',
  'password.tooShort': 'Parol kamida {min} belgidan iborat boʻlishi kerak.',
  'auth.invalidCredentials': 'Email yoki parol notoʻgʻri.',
});

/** Oʻzbekcha tur nomlari ("Bu kategoriya chiqim uchun mos emas."). */
export const TYPE_WORDS = Object.freeze({ income: 'kirim', expense: 'chiqim' });
export const PERIOD_WORDS = Object.freeze({ weekly: 'haftalik', monthly: 'oylik' });

export function message(code, params = {}) {
  const template = MESSAGES[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
