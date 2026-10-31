# Finora arxitekturasi (yangilanib boradigan hujjat)

## Asosiy qarorlar

| Mavzu | Tanlov | Sababi |
|---|---|---|
| Frontend | Vanilla ES modullar, hash-router SPA, build bosqichisiz | Bitta ilova qobigʻi, silliq oʻtishlar, kam bogʻliqlik |
| Backend | Node.js + Express, qatlamli: routes > controllers > services > repositories | Har qatlamning bitta vazifasi, test qilish oson |
| Maʼlumotlar bazasi | SQLite (`better-sqlite3`), keyinchalik PostgreSQL | Sozlash shart emas; faqat `repositories/` va migratsiyalar oʻzgaradi |
| Pul | Butun son, minor birlik (x100) | Suzuvchi nuqta xatolari yoʻq |
| ID | UUID | localStorage maʼlumotini serverga koʻchirganda toʻqnashuv boʻlmaydi |
| Umumiy mantiq | `shared/` (client va server) | Statistika, tahlil, validatsiya bir marta yoziladi |
| Shrift / ikonlar / grafik | Manrope (oʻzimizda), Lucide uslubidagi inline SVG, Chart.js 4 (lokal) | CDN yoʻq, qattiq CSP mumkin |
| Til | Oʻzbek (lotin), matnlar `i18n/uz.js` da | Boshqa til qoʻshish uchun yangi fayl kifoya |

## Maʼlumot oqimi

```
Sahifa -> servis / repozitoriy -> adapter
                                   |- local: localStorage  finora:v1:{userId}:{collection}
                                   '- api:   REST /api/v1  (8-bosqich)
```

Adapter interfeysi: `list, get, create, update, remove, replaceAll, clear, getDocument, setDocument`.
Repozitoriylar `data:changed` hodisasini yuboradi; qobiq ochiq sahifani yangilaydi.

## Sahifa shartnomasi

```js
export const title = t('nav.dashboard');
export async function render(ctx) { /* Node qaytaring */ }
export function skeleton() { /* ixtiyoriy; render sekin boʻlsagina koʻrsatiladi */ }
```

- `ctx.onMounted(fn)`: sahifa DOMga qoʻyilgach (grafiklar uchun).
- `ctx.onCleanup(fn)`: sahifadan chiqilganda yoki qayta chizilganda.
- `ctx.refresh()`: joyida qayta chizish.
- `ctx.query` (`URLSearchParams`) va `ctx.setQuery(obj)`: manzil parametrlari. `setQuery` sahifani qayta chizmaydi
  (`history.replaceState`), shuning uchun filtrlar ulashiladi, yangilashdan keyin saqlanadi va orqaga tugmasi ishlaydi.

## Tranzaksiyalar (2-bosqich)

```
forma qoralamasi -> shared/validators -> normallashgan yozuv -> repozitoriy -> adapter
```

- **Qoralama**: formadan yoki API dan keladigan maʼlumot (summa matn, sana + vaqt foydalanuvchi zonasida).
  Validator maydon xatolarini (kod + oʻzbekcha matn) yoki normallashgan yozuvni qaytaradi.
- Valyutali tranzaksiya yaratilgan paytdagi kursni va manbasini (`fxRateSource`: hozir `demo`, keyin `cbu`) saqlaydi.
- Qidiruv / filtr / saralash: `shared/transactionQuery.js`; `normalizeQuery()` URL parametrlarini tozalaydi.
- Eksport: `shared/exportFormats.js` sof funksiyalar; `EXPORT_FORMATS` roʻyxatiga PDF qoʻshish bitta yozuv.
- CSV katakchalari `= + - @` bilan boshlansa, oldiga `'` qoʻyiladi (jadval formulasi orqali hujum).
- Birinchi ishga tushirish: onboarding namunaviy maʼlumot yoki toza boshlashni tanlatadi; hech narsa jimgina yaratilmaydi.
- Asosiy valyutani tranzaksiyalar mavjud boʻlgach oʻzgartirish hozircha qoʻllab-quvvatlanmaydi (qayta baholash kerak);
  u faqat onboarding paytida tanlanadi.

## Statistika va aqlli tahlillar (3-bosqich)

- `shared/stats.js`: `weekStatistics`, `monthSeries`, `monthStatistics`, `yearStatistics`, `elapsedDays`, `availableYears`.
- **Adolatli oʻrtacha qoidasi**: davom etayotgan hafta yoki oyning oʻrtachasi faqat *oʻtib ketgan* kunlarga boʻlinadi.
  Aks holda joriy hafta sunʼiy ravishda "arzon" koʻrinadi.
- **Adolatli solishtirish qoidasi**: davom etayotgan hafta/oy oldingisining *shu miqdordagi kunlari* bilan solishtiriladi
  (payshanba kuni: shu haftaning du–pa kunlari va oʻtgan haftaning du–pa kunlari), hech qachon oʻtgan haftaning butun
  uzunligi bilan emas. Dushanba kuni solishtirish qilinmaydi (juda shovqinli).
- `shared/insights.js` matn emas, **tuzilmali natija** qaytaradi (`{ type, tone, priority, ...qiymatlar }`).
  Matnni klient `services/insightsService.js` da `i18n/uz.js` shablonlaridan yasaydi: tarjima va formatlash mantiqdan ajratilgan,
  server esa xuddi shu mantiqdan foydalana oladi. Chegaralar `INSIGHT_RULES` da, testlarda tekshiriladi.
- Tahlillar hech qachon tavsiya bermaydi, faqat nima boʻlganini aytadi va har doim "moliyaviy maslahat emas" izohi bilan keladi.
- Statistika sahifasining tablari havola koʻrinishida (`#/statistics?tab=monthly`); grafik `incomeExpenseChart`
  komponenti bosh sahifada ham, statistikada ham ishlatiladi va `update()` bilan qayta yaratilmasdan yangilanadi.

## Valyuta kursi (4-bosqich)

- **Manba**: Oʻzbekiston Markaziy banki (CBU) rasmiy JSON API'si, API kalitisiz.
  `GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/` (bugungi barcha valyutalar) va
  `GET .../json/all/{YYYY-MM-DD}/` (bitta kun). Haqiqiy javob shakli tekshirilgan va
  `server/providers/exchange/cbuProvider.js` ustidagi testlarda (`tests/server/cbuProvider.test.js`)
  hujjatlashtirilgan.
- **Sana ishonchliligi tekshiruvi**: CBU sana parametrini eʼtiborsiz qoldirib "bugungi" kursni
  qaytarishi mumkin boʻlgan holatlar kuzatilgan. `isPlausibleForDate()` qaytgan sana soʻralgandan
  keyin boʻlsa yoki undan 5 kundan koʻp oldin boʻlsa, javobni rad etadi (`null`) — dam olish kuni
  uchun oldingi ish kunining kursi qabul qilinadi, lekin notoʻgʻri sana jimgina qabul qilinmaydi.
- **Zanjir** (`server/services/exchangeService.js`, `createExchangeService` fabrikasi): bugungi fayl-kesh
  -> CBU -> ikkilamchi provayder (`.env`dagi `EXCHANGE_SECONDARY_API_KEY` boʻlsa) -> oxirgi maʼlum kurs
  (`stale: true`) -> demo (`demo: true`). Har bosqich xatosi `console.warn` bilan log qilinadi va
  keyingisiga oʻtiladi; foydalanuvchiga xom xato hech qachon chiqmaydi.
- **Kesh**: `server/data/exchange-rates.json` (fayl, gitignored) — 8-bosqichdagi `exchange_rates`
  jadvali kelguncha vaqtinchalik yechim; interfeysi (`get/set/range/latestBefore`) bir xil qoladi,
  shuning uchun DB ga oʻtishda faqat `exchangeStore.js` almashadi.
- **Tarixiy toʻldirish**: `scripts/backfillRates.js` — CBU'dan oxirgi N kunni ketma-ket (150ms
  pauza bilan) yuklaydi. Foydalanuvchi soʻrovi paytida katta tarixiy boʻshliq **jonli** toʻldirilmaydi
  (sekin boʻlardi); agar kesh yetarli toʻliq boʻlmasa (<50% qamrov), butun diapazon `demo: true`
  bilan koʻrsatiladi — haqiqiy va demo nuqtalar hech qachon bitta grafikda aralashtirilmaydi.
- **Testlanish**: bu qopqonda (sandbox) `cbu.uz`ga tashqi ulanish tarmoq siyosati bilan bloklangan
  (403). Bu servis zanjirining "CBU ishlamadi -> demo" yoʻlini **haqiqiy tarmoq xatosi** orqali
  sinash imkonini berdi. Birlik testlari (`tests/server/exchangeService.test.js`) esa soxta CBU
  provayder bilan `createExchangeService`/`createExchangeStore` fabrikalari orqali toʻliq
  izolyatsiyalangan — tashqi tarmoq yoki mock kutubxonasi shart emas.
- **Klient** (`client/js/services/exchangeService.js`): serverning `/api/v1/exchange/*` bilan
  gaplashadi; server umuman ishlamasa ham (masalan, orqa tomon ochilmagan boʻlsa), oʻzining
  `shared/exchangeDemo.js` bilan yana bir marta demo koʻrsatadi. Ikki qavatli himoya.

## Byudjetlar (5-bosqich)

- `shared/budgets.js`: `currentBudgetPeriod()` (haftalik = shu hafta, oylik = shu oy),
  `computeBudgetStatus()` (sarflangan/qolgan/foiz/holat), `detectThresholdCrossing()` — ikkinchisi
  sof funksiya boʻlib, faqat "oldin" va "keyin" sarflangan summani solishtiradi, shuning uchun
  ogohlantirish har safar emas, chegara **ENDIGINA** kesib oʻtilganda bir marta chiqadi.
- Bitta kategoriya + davr kombinatsiyasiga bitta byudjet (DB'dagi UNIQUE(user_id, category_id, period)
  bilan mos); dublikat `shared/validators.validateBudgetDraft()` da rad etiladi.
- **Integratsiya**: `transactionsService.saveTransaction()` xarajat saqlangandan keyin
  `budgetsService.checkThresholdCrossings()` ni chaqiradi (faqat tranzaksiya SHU davr — joriy hafta/oy —
  ichida boʻlsa; orqaga sanalgan yozuv joriy holatga taʼsir qilmaydi). Natija forma orqali toast
  sifatida koʻrsatiladi. Tahrirlashda eski summa hisobga olinadi (kategoriya oʻzgarmagan boʻlsa).
- Byudjet faqat `kind: 'expense'` yoki `'both'` kategoriyalar uchun (Maosh kabi kirim kategoriyalari
  roʻyxatda chiqmaydi).

## Maqsadlar (6-bosqich)

- `shared/goals.js`: `computeGoalProgress()` (foiz, qolgan summa, muddatgacha kun, muddati oʻtganmi),
  `didCompleteGoal()` — byudjetdagi `detectThresholdCrossing()` bilan bir xil mantiq: bildirishnoma
  faqat maqsad ENDIGINA 100% ga yetganda chiqadi, har "pul qoʻshish"da emas.
  - `remaining` hech qachon manfiy boʻlmaydi (`Math.max(target - current, 0)`), lekin `ratio` cheklanmagan
    (ortiqcha yigʻilgan boʻlsa 100% dan yuqori koʻrsatiladi — progress bar `Math.min(ratio, 1)` bilan chiziladi).
- Byudjetlardan farqli oʻlaroq, `currentAmount` avtomatik hisoblanmaydi — foydalanuvchi "Pul qoʻshish"
  orqali qoʻlda oshiradi (`services/goalsService.contributeToGoal()`). `status` (faol/yakunlangan) saqlanmaydi,
  har doim `currentAmount >= targetAmount` asosida oʻqishda hisoblanadi.
- Roʻyxat tartibi: faol maqsadlar muddatigacha eng kam kun qolganidan boshlab, muddatsizlar oxirida,
  yakunlanganlar eng pastda.

## Autentifikatsiya + Profil (7-bosqich)

- **Maʼlumotlar bazasi**: `node:sqlite` (Node 22.5+, built-in). `better-sqlite3` yoki boshqa paket
  emas: hech qanday native kompilyatsiya yoki prebuilt binary yuklab olish shart emas, `npm install`
  shu qadar sodda boʻlishi uchun muhim. API'si deyarli bir xil (sinxron `prepare().run/get/all`),
  shuning uchun kerak boʻlsa kelajakda almashtirish oson. Hozircha "experimental" deb belgilangan;
  `database/silenceExperimentalWarning.js` shu haqidagi foydasiz ogohlantirishni bostiradi
  (standart listenerni olib tashlab, faqat SQLite haqidagisini filtrlaydi — boshqa hammasi koʻrinadi).
- **Parol xeshlash**: `argon2` oʻrniga Node'ning oʻrnatilgan `crypto.scrypt`si (xotira-qiyin KDF,
  OWASP tomonidan tan olingan). Sabab bir xil: native bogʻlanishdan qochish. Format
  `scrypt:N:r:p:tuzHex:xeshHex` — parametrlar xeshning oʻzida, kelajakda oshirilishi mumkin.
  Solishtirish `timingSafeEqual` bilan (vaqt hujumidan himoya).
- **Sessiya**: xom token faqat cookie'da (`httpOnly`, `sameSite=lax`), bazada faqat SHA-256 xeshi.
  Cookie qoʻlda yasaladi (`utils/cookies.js`) — `cookie-parser` kabi paketga ehtiyoj sezilmadi,
  format juda sodda va loyihada faqat bitta cookie ishlatiladi.
- **Dependency injection**: `createUsersRepository(db)`, `createSessionsRepository(db)`,
  `createSessionService({sessionsRepository, ...})` — barchasi 4-bosqichdagi
  `createExchangeStore`/`createExchangeService` bilan bir xil naqsh. Sabab ham bir xil: modul
  darajasidagi "muzlatilgan" yagona nusxalar (`env` kabi) testlarni bir-biriga bogʻlab qoʻyadi.
  Haqiqiy ilova uchun ulash nuqtasi — `controllers/authController.js`: u yerda birinchi marta
  haqiqiy bazaga ulanadi; testlar esa `createTestDb()` (xotiradagi `:memory:`, har chaqiriqda yangi)
  bilan toʻliq izolyatsiyalangan.
- **Muhim doiraviy qaror**: bu bosqich FAQAT foydalanuvchi identifikatsiyasini qoʻshadi (ism, email,
  parol, sessiya). Tranzaksiya/kategoriya/byudjet/maqsad hali localStorage'da qoladi va kirish
  holatidan mustaqil ishlaydi — ularni serverga koʻchirish va hisobga bogʻlash 8-bosqichda boʻladi.
  Shuning uchun hozircha login "qurilmalar orasida sinxronlash"ni TAʼMINLAMAYDI — bu Profil
  sahifasida va roʻyxatdan oʻtish shaklida ochiq aytiladi (`auth.localDataNotice`).
- Login/parol xatosi va "email topilmadi" xatosi ATAYLAB bir xil xabar bilan qaytadi (foydalanuvchi
  mavjudligini bilib olishning oldini olish uchun) — testda ikkalasi solishtirilib tekshiriladi.
- Test uskunasida (`/tmp/jsd/harness.mjs`) oddiy cookie-jar qoʻshildi: `credentials:'include'` bilan
  chaqirilgan `fetch` javobidagi `Set-Cookie`ni ushlab, keyingi soʻrovlarga qoʻshadi — brauzerning
  tabiiy xatti-harakatini taqlid qilib, sessiya oqimini haqiqiy HTTP orqali sinash imkonini beradi.

## Toʻliq baza + REST API (8-bosqich)

- **Sxema kengaytirildi** (`0002_finance.sql`): `transactions`, `budgets`, `goals` jadvallari, plyus
  `users` jadvaliga moliyaviy sozlamalar ustunlari (`opening_balance`, `plan`, `onboarded_at`,
  `has_demo_data`, `demo_seeded_at`). Kategoriyalar uchun ALOHIDA jadval yoʻq: tizim kategoriyalari
  hamon `shared/constants.js` da (kod ichida); moslashuvchan (custom) kategoriya qoʻshish uchun UI
  hali yoʻq, shuning uchun `GET /categories` hozircha doim boʻsh roʻyxat qaytaradi (YAGNI).
- **Serverdagi mantiq minimal**: byudjet/maqsad progressi, statistika, aqlli tahlillar — bularning
  BARCHASI hamon `shared/` dagi sof funksiyalar orqali KLIENT tomonida hisoblanadi, xuddi mahalliy
  rejimda boʻlgani kabi. Server faqat CRUD saqlashni taʼminlaydi; adapter naqshi tufayli bu
  mantiqni serverda TAKRORLASHGA hojat yoʻq — `apiAdapter` xuddi `localAdapter` bilan bir xil
  xom maʼlumotni qaytaradi, qolgan hammasi oʻzgarishsiz ishlayveradi.
- **Klient tomonidagi adapter tanlovi DINAMIK** (`data/adapters/index.js`): `getAdapter()` har
  chaqiruvda joriy sessiya holatini tekshiradi — hisobga kirilgan boʻlsa `apiAdapter`, aks holda
  `localAdapter`. Repozitoriylar adapterni HECH QACHON keshlamaydi (har metodda qayta soʻraydi),
  shuning uchun kirish/chiqish sahifani qayta yuklamasdan toʻgʻri manbaga oʻtkazadi.
- **Bir martalik import, faqat roʻyxatdan oʻtishda** (`services/importService.js`): shu qurilmadagi
  mahalliy maʼlumot (agar bor boʻlsa, demo tranzaksiyalardan tashqari) yangi hisobga NUSXALANADI
  (oʻchirilmaydi). Bu ATAYLAB faqat roʻyxatdan oʻtishda ishlaydi, KIRISHDA emas — aks holda
  mavjud (boshqa) hisobga kirganingizda bu qurilmaning aloqasi boʻlmagan mahalliy maʼlumoti
  tasodifan haqiqiy hisobingizga aralashib ketishi mumkin edi. Demo maʼlumot hech qachon
  koʻchirilmaydi (`isDemo: true` filtrlanadi) — ular foydalanuvchiniki emas.
- **Onboarding**: "Namunaviy maʼlumot bilan tanishish" tugmasi endi faqat MEHMON holatida
  koʻrinadi — hisobga kirgan holatda namuna maʼlumotni haqiqiy hisobga yozish mantiqsiz, va
  `apiAdapter.replaceAll()` ataylab qoʻllab-quvvatlanmaydi (aniq xato bilan).
- **Server tomonidagi validatsiya**: klient allaqachon `shared/validators.js` orqali toʻliq
  qoralama validatsiyasidan oʻtkazgan, normallashgan yozuvni yuboradi (minor-birlik summa, ISO
  sana). Server shuning uchun toʻliq qoralama emas, balki NORMALLASHGAN YOZUV shaklini tekshiradi
  (turlar toʻgʻrimi, sonlar musbat va chegarada) — "serverga hech qachon ishonma" tamoyiliga sodiq
  qolgan holda, ikki xil validatordan qochib soddalik saqlangan. Bazadagi CHECK/UNIQUE cheklovlari
  qoʻshimcha himoya qatlami (masalan bitta kategoriya+davrga ikkita byudjet DB darajasida ham rad
  etiladi, xatolik xabari hali silliqlashtirilmagan — 9-bosqichda yaxshilanadi).
- **Foydalanuvchilar orasida qatʼiy izolyatsiya**: har bir soʻrov `WHERE user_id = ?` bilan
  chegaralangan; boshqa hisobning yozuvini ID orqali ochishga urinish "ruxsat yoʻq" emas,
  "topilmadi" (404) qaytaradi — bu yozuv borligini ham bildirib qoʻymaslik uchun.
- **Testlanish**: `tests/server/dataApi.test.js` haqiqiy HTTP orqali (Express + vaqtinchalik SQLite
  fayl) CRUD, himoya, shakl xatolari, foydalanuvchilar izolyatsiyasi va import oqimini tekshiradi.
  jsdom I-stsenariysi esa BUTUN sikl: mehmon holatida real maʼlumot → roʻyxatdan oʻtish (import) →
  hisobdalik paytida yangi yozuv → chiqish (mahalliy holat TIKLANADI, hisobdagi yozuv koʻrinmaydi)
  → qayta kirish (IKKALASI HAM serverdan qaytadi) — orqali toʻliq tekshirilgan.

## Xavfsizlik (9-bosqich)

Himoya bir nechta qatlamdan iborat (defense-in-depth) — har biri boshqasisiz ham ishlaydi:

- **HTTP sarlavhalari** (`server/middleware/security.js`): [Helmet](https://helmetjs.github.io/)
  qatʼiy Content-Security-Policy bilan — `default-src 'self'` va hamma boshqa direktiva ham `'self'`
  (yoki `'none'`), chunki loyihada tashqi CDN umuman ishlatilmaydi: Chart.js ham lokal serverdan
  (`/vendor/chart.js/chart.umd.js`) beriladi. Bu CSP xavfsiz ekani UI qatlamining `h()`/`s()`
  yordamchilari hech qachon `innerHTML` yoki inline `style=""` ishlatmasligi (CSSOM —
  `el.style.setProperty` orqali) bilan tasdiqlangan (grep orqali tekshirilgan). HSTS faqat
  `NODE_ENV=production` da yoqiladi — lokal `http://localhost` buzilmasin deb.
- **CSRF** (`server/middleware/csrf.js` + `client/js/utils/csrf.js`): "double-submit cookie" naqshi.
  `ensureCsrfCookie` har soʻrovda `finora_csrf` cookie'sini (httpOnly EMAS — JS oʻqishi kerak)
  oʻrnatadi, `verifyCsrfToken` esa oʻzgaruvchi metodlarda (POST/PATCH/DELETE) shu qiymat
  `X-CSRF-Token` sarlavhasida qaytarilganini `crypto.timingSafeEqual` bilan tekshiradi. Sessiya
  cookie'si allaqachon `SameSite=Lax`, shuning uchun bu qoʻshimcha qatlam — lekin birga ishlashi
  "defense-in-depth" tamoyiliga mos.
- **Tezlik cheklovi** (`server/middleware/rateLimit.js`): xotiradagi (in-memory) oddiy
  `Map<key, timestamps[]>` — `/auth/login` va `/auth/register` uchun kalit `IP:email`, oyna
  `env.rateLimit.authWindowMs` (sukut 15 daqiqa), chegarasi `env.rateLimit.authMax` (sukut 10).
  Oshib ketsa 429 + `Retry-After` sarlavhasi. **Eslatma**: bu yechim bitta Node jarayoni (process)
  doirasida ishlaydi; koʻp nusxali (horizontal scaled) joylashtirishda Redis kabi umumiy xotira
  kerak boʻladi — hozircha loyiha bitta nusxada (instance) ishlaydi deb faraz qilinadi.
- **DB darajasidagi dublikatlar toza xato bilan**: SQLite `UNIQUE` cheklovi (masalan bitta
  foydalanuvchi uchun bir xil kategoriya+davrda ikkinchi byudjet) buzilganda xomaki 500 oʻrniga
  `runOrConflict` yordamchisi uni ushlab, toza 409 `CONFLICT` qaytaradi
  (`server/controllers/dataController.js`). `POST /import` esa butunlay bitta DB tranzaksiyasida
  (`BEGIN`/`COMMIT`/`ROLLBACK`) ishlaydi: agar importdagi biror yozuv mavjud maʼlumot bilan
  toʻqnashsa, O'SHA IMPORTdagi barcha yozuvlar (tranzaksiya, byudjet, maqsad, profil) bekor
  qilinadi — "hammasi yoki hech narsa" (atomiklik).
- **Parollar**: `crypto.scrypt` (Node yadrosida, `argon2` kabi tashqi/native bog'liqlik shart
  emas) — 7-bosqichdan beri.
- **SQL-inʼektsiya**: barcha soʻrovlar `node:sqlite` prepared statement orqali parametrlangan.
- **Sirlar**: `.env` da (`.env.example` namuna sifatida qoʻshildi — `RATE_LIMIT_*`,
  `DATABASE_PATH`, `COOKIE_SECURE`, `SESSION_TTL_DAYS`, `EXCHANGE_SECONDARY_API_KEY`), klient
  kodida hech qanday API kalit yoʻq.
- **Testlanish**: `tests/server/helpers/httpClient.js` — brauzerga oʻxshab sessiya VA CSRF
  cookie'larini avtomatik boshqaradigan test mijozi. `tests/server/auth.test.js` ga CSRF-rad etish
  va tezlik-cheklovi testlari, `tests/server/dataApi.test.js` ga 409-dublikat va import-atomiklik
  testlari qoʻshildi.

## Ishlab chiqarishga tayyorlash (10-bosqich)

- **Siqish**: `compression` middleware'i (`server/app.js`, `securityHeaders`dan keyin, boshqa
  hamma narsadan OLDIN). Helmet kabi bu ham ataylab qilingan "tayyor va keng auditlangan paket"
  istisnosi — gzip algoritmini qoʻlda qayta yozish maʼnosiz va xato-xavfli boʻlardi.
- **PDF eksport**: arxitektura `shared/exportFormats.js` dagi "sof funksiyalar" naqshiga amal
  qiladi — `buildTransactionsPdfRows()` DOM'siz, faqat ustun sarlavhalari va formatlangan
  qatorlarni qaytaradi (xuddi CSV builder kabi). Haqiqiy PDF chizish esa
  `client/js/services/exportService.js` da, chunki jsPDF/AutoTable brauzer global
  (`window.jspdf`) sifatida ishlaydi va DOM'siz muhitda (masalan testlarda) ishlamaydi.
  jsPDF va AutoTable UMD bandle'lari Chart.js kabi serverdan lokal beriladi
  (`/vendor/jspdf/...`, `/vendor/jspdf-autotable/...`, `server/app.js` + `server/config/env.js`
  `paths.jspdf`/`paths.jspdfAutotable`) — CSP `script-src 'self'` buzilmaydi, hech qanday CDN yoʻq.
  `client/index.html` ularni Chart.js bilan bir xil naqshda (`<script defer>`, modul
  skriptidan OLDIN) yuklaydi.
- **Sahifalash**: `transactionsRepository.list(userId, pagination?)` ikkinchi (ixtiyoriy)
  argument qabul qiladi — berilsa `ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?` bilan
  SQL darajasida sahifalaydi va `count(userId)` jami sonni beradi.
  `dataController.js`dagi `transactions.list` buni `?limit=&offset=` soʻrov parametrlaridan
  oʻqiydi; `limit` berilmasa (yoki notoʻgʻri boʻlsa) **eski shartnoma** saqlanadi — toʻliq
  roʻyxat, `meta` maydonisiz. Bu ataylab shunday: klientning standart maʼlumot oqimi
  (`data/adapters/apiAdapter.js`) hamon "hammasini olib, mahalliy filtrlash" strategiyasiga
  tayangan — uni sahifalashga oʻtkazish katta va xavfli qayta qurish boʻlardi, shuning uchun
  Faqat API darajasida tayyorlab qoʻyildi (kelajakda foydalanuvchida minglab tranzaksiya
  toʻplansa, shu yerga ulash kerak boʻladi).
- **Docker**: koʻp bosqichli `Dockerfile` (`node:22-alpine`) — birinchi bosqich
  `npm ci --omit=dev` bilan faqat ishlab chiqarish bog'liqliklarini oʻrnatadi, ikkinchisi esa
  ularni va kerakli kodni (`server/`, `client/`, `shared/`, `scripts/`) root boʻlmagan
  foydalanuvchi (`finora`) ostida ishga tushiradi. `server/data/` nomlı volume sifatida
  eʼlon qilingan — konteyner oʻchirilganda SQLite bazasi yoʻqolmasligi uchun. HEALTHCHECK
  `GET /api/v1/health` ni tekshiradi. **Bu Dockerfile shu ishlab chiqish muhitida (Docker demon
  yoʻq) ishga tushirib sinalmadi** — faqat qoʻlda koʻrib chiqildi va standart Node/Alpine
  naqshiga amal qiladi; foydalanuvchi oʻz muhitida `docker build` qilib tekshirishi tavsiya
  etiladi.
- **Lighthouse-uslubidagi qoʻlda koʻrib chiqish**: `meta viewport`, `meta description`,
  `theme-color`, `font-display: swap` (`client/css/tokens.css`), semantik struktura va
  klaviatura/ekran-oʻquvchi qoʻllovi — bularning barchasi avvalgi bosqichlarda allaqachon toʻgʻri
  qilingan edi, shuning uchun bu bosqichda qoʻshimcha oʻzgarish shart boʻlmadi.

## Tariflar: Bepul / Premium / Mega Premium (loyiha)

`shared/plans.js` tariflarni maʼlumot sifatida saqlaydi (har tarif faqat *qoʻshadigan* imkoniyatlarni sanaydi;
`featuresForPlan()` merosni hal qiladi). `services/entitlements.js` `can(featureKey)` beradi; `config.enforcePlans = false`
boʻlganda hamisi ruxsat etiladi. Imkoniyatlar taqsimoti mahsulot egasi tasdiqlashini kutmoqda. Toʻlov akkaunt va serverni
talab qilgani uchun 7B-bosqichda.

## Dastlabki rejadan farqlar

- Shrift: Inter oʻrniga **Manrope** (raqamlari yaxshiroq).
- Tozalash `ctx.onCleanup` orqali (modul darajasidagi `destroy()` oʻrniga): ikki chizish ustma-ust tushsa, grafiklar bir-birini buzmaydi.
- Toastlar oʻz navbatini oʻzi boshqaradi (store da emas).
- Profilga `openingBalance` (kuzatuvdan oldingi pul: balansga qoʻshiladi, daromadga emas) va `plan` qoʻshildi.
- Ikonlar `lucide` paketi emas, `utils/icons.js` dagi Lucide uslubidagi qoʻlda chizilgan yoʻllar.
- Sanalar oʻzbekcha (`20 sen`, `Yakshanba, 20 sentabr 2026`); oy va hafta kuni nomlari qatʼiy roʻyxat, chunki `Intl` brauzerlarda farq qiladi.
- Namunaviy maʼlumot avtomatik emas, onboarding tanlovi bilan yaratiladi.
- Butun loyiha oʻzbek tiliga oʻtkazildi; eski `en.js` olib tashlandi.

## Yoʻl xaritasi

1. Bosh sahifa + interfeys qobigʻi (tayyor)
2. Tranzaksiyalar, Kategoriyalar, Onboarding, CSV/JSON eksport, Tariflar sahifasi (tayyor)
3. Statistika (haftalik / oylik / yillik) + Aqlli tahlillar (tayyor)
4. Valyuta kursi: provayder zanjiri, tarixiy grafik, konverter (tayyor)
5. Byudjetlar  (tayyor)
6. Maqsadlar  (tayyor)
7. Autentifikatsiya + Profil (SQLite, sessiyalar)  (tayyor)
7B. Tariflar va toʻlov: serverdagi tarif, toʻlov provayderi, `can()` ni majburiy qilish
8. Maʼlumotlar bazasi + REST API, `dataMode = 'api'`, localStorage dan import  (tayyor)
9. Xavfsizlik (Helmet/CSP, cheklovlar, CSRF, audit)  (tayyor)
10. Ishlab chiqarishga tayyorlash (sahifalash, siqish, Lighthouse, Docker, PDF eksport)  (tayyor)

## Admin paneli

- **Kirish**: logotipni 5 marta ketma-ket bosish (`client/js/admin/secretTrigger.js`, tanaffus 900 ms) `#/admin/login` ni ochadi.
  Bu faqat qulaylik; haqiqiy himoya serverda. `#/admin...` manzillarida `main.js` butunlay alohida admin ilovasini yuklaydi
  (`client/js/admin/`); oddiy ilova va admin orasida oʻtishda sahifa qayta yuklanadi.
- **Autentifikatsiya**: alohida `admins` jadvali va `finora_admin` cookie'si (HttpOnly, SameSite=Strict, path `/api/v1/admin`).
  Parol scrypt bilan xeshlanadi, tokenlarning faqat SHA-256 xeshi saqlanadi. 5 ta xato urinishdan keyin 15 daqiqa bloklash,
  IP boʻyicha tezlik cheklovi, mutlaq (8 soat) va harakatsizlik (60 daqiqa) muddati. Notoʻgʻri login va notoʻgʻri parol xabari bir xil.
- **Boshlangʻich admin**: `.env` dagi `ADMIN_BOOTSTRAP_USERNAME/PASSWORD` dan faqat `admins` jadvali boʻsh boʻlganda yaratiladi
  (`must_change_password=1`). Ishlab chiqarishda zaif (<12 belgi) parol bilan YARATILMAYDI va parol almashtirilmaguncha
  boshqa admin API yoʻllari 403 qaytaradi. Lokal ishlab chiqishda faqat ogohlantirish banneri koʻrsatiladi.
- **RBAC**: `superadmin` (hamma amal) va `viewer` (faqat oʻqish). Hamma `/api/v1/admin/*` marshruti `requireAdmin`dan, oʻzgartiruvchilari `requireWrite`dan oʻtadi.
- **Audit**: `audit_log` append-only (SQLite triggerlari UPDATE/DELETE ni taqiqlaydi), sirli kalitlar avtomatik olib tashlanadi.
  Nozik amallar (hisobni toʻxtatish, tarif tayinlash, narx/holat oʻzgarishi) kamida 5 belgili SABAB talab qiladi.
- **Tariflar**: `tariffs` jadvali `shared/plans.js` dan seed qilinadi; narxlar 0 (mahsulot egasi belgilamagan). Narx tarixi yuritiladi.
  Mavjud obunachilarning `users.plan` qiymati narx/holat oʻzgarishida HECH QACHON oʻzgarmaydi.
- **Balans/toʻlovlar**: FINORA da toʻlov tizimi yoʻq (7B). "Toʻlovlar" sahifasi buni aytadi va foydalanuvchilarning shaxsiy
  yozuvlarini faqat oʻqish rejimida koʻrsatadi (tavsif/izohsiz). Admin balansni oʻzgartira olmaydi.
- **Sozlamalar**: faqat ulangan kalitlar (`SETTING_DEFS`): sayt nomi/tavsifi, texnik ishlar, roʻyxatdan oʻtish, eʼlon, standart tarif, hujjat matnlari.
- **Ommaviy**: `GET /api/v1/public/settings` (sirsiz) — oddiy ilova texnik ishlar/eʼlon bannerini koʻrsatadi.
- **Oʻzgargan mavjud fayllar**: `server/app.js`, `server/server.js`, `server/config/env.js`, `server/controllers/authController.js`,
  `client/js/main.js`, `client/js/components/brandLogo.js`, `client/index.html`, `.env.example`.
