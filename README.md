# Finora

**Pulingizni biling. Kelajagingizni boshqaring.**

Shaxsiy moliyaviy yordamchi veb-ilova: kirim va chiqimlarni yozing, haftalik / oylik / yillik statistikani koʻring,
USD/UZS kursini kuzating, byudjet va maqsadlar belgilang. Interfeys **toʻliq oʻzbek tilida** (lotin yozuvi).

> **Holat: barcha 10 bosqich tayyor** (Bosh sahifa, Tranzaksiyalar, Statistika + Aqlli tahlillar, Valyuta kursi,
> Byudjetlar, Maqsadlar, Autentifikatsiya, Toʻliq baza + REST API, Xavfsizlik, Ishlab chiqarishga tayyorlash).

## Ishga tushirish

Node.js **22.5.0 yoki yangiroq** kerak (`node:sqlite` uchun — hech qanday tashqi native paket oʻrnatish shart emas).

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # xuddi shu, fayl oʻzgarganda qayta ishga tushadi
npm test           # shared/ va til butunligi testlari
```

Ixtiyoriy: portni oʻzgartirish uchun `cp .env.example .env`.

## Hozir nimalar ishlaydi

- **Bosh sahifa**: balans, daromad, xarajat, jamgʻarma, aqlli tahlillar, haftalik grafik, soʻnggi tranzaksiyalar,
  kategoriyalar boʻyicha xarajat, USD/UZS kartasi
- **Tranzaksiyalar**: qoʻshish, tahrirlash, oʻchirish (tasdiq bilan); qidiruv; tur, kategoriya va sana boʻyicha filtr;
  4 xil saralash; filtrlar manzilda (URL) saqlanadi
- **Kategoriyalar**: har kategoriya boʻyicha jami, ulush va soni; davr tanlash; doughnut grafik
- **Statistika**
  - *Haftalik*: dushanba–yakshanba grafigi, 6 koʻrsatkich (daromad, xarajat, jamgʻarma, oʻrtacha kunlik xarajat,
    eng koʻp va eng kam xarajat kuni), kunlar jadvali, haftalar orasida yurish
  - *Oylik*: 12 oylik grafik (tanlangan oy ajralib turadi, ustunni bosib oyni almashtirish mumkin), 7 koʻrsatkich, kategoriyalar
  - *Yillik*: jami daromad/xarajat/jamgʻarma, jamgʻarma darajasi, eng yaxshi va eng qimmat oy, sof natija chizigʻi, oylar jadvali
- **Aqlli tahlillar**: faqat sizning maʼlumotlaringizdan hisoblangan statistik xulosalar (maslahat emas)
- **Eksport**: CSV (Excelda ochiladi, formula-injectiondan himoyalangan), toʻliq JSON zaxira nusxa
  va formatlangan **PDF** hisobot (10-bosqich — jsPDF + AutoTable, toʻliq lokal, CDN yoʻq)
- **Onboarding**: valyuta, boshlangʻich balans, birinchi tranzaksiya yoki namunaviy maʼlumotlar bilan tanishish
- **Valyuta kursi**: joriy USD/UZS kursi (Oʻzbekiston Markaziy banki — CBU — rasmiy API'si orqali),
  kurs tarixi grafigi (1 kun / 7 kun / 1 oy / 3 oy / 6 oy / 1 yil), valyuta konverteri. CBU ishlamasa
  avtomatik zaxira zanjiriga oʻtadi (oxirgi maʼlum kurs, keyin demo), hech qachon xato koʻrsatmaydi
- **Byudjetlar**: kategoriya boʻyicha haftalik yoki oylik xarajat limiti. Progress bar (yashil/sariq/qizil),
  80% va 100% chegarasi ENDIGINA kesib oʻtilganda bir martalik toast-ogohlantirish
- **Maqsadlar**: nom, kerakli summa, muddat (ixtiyoriy) bilan moliyaviy maqsad yarating; "Pul qoʻshish"
  tugmasi bilan progress kuzating; maqsadga erishilganda tabriklovchi bildirishnoma chiqadi
- **Autentifikatsiya**: roʻyxatdan oʻtish, kirish, chiqish — haqiqiy SQLite baza va serverdagi
  sessiya (cookie) bilan
- **Toʻliq baza + REST API**: tranzaksiya, byudjet, maqsad va profil sozlamalari endi hisobingizga
  bogʻlangan holda SQLite'da saqlanadi. **Hisobga kirgan holatda** ma'lumotlar server orqali
  (`/api/v1/*`), **mehmon holatida** esa hamon shu qurilmada (localStorage) saqlanadi — hech qanday
  qo'shimcha sozlashsiz, avtomatik. Roʻyxatdan oʻtganingizda shu qurilmadagi mahalliy
  ma'lumotlaringiz (agar bor bo'lsa) bir martalik nusxalanadi va hisobingizga koʻchiriladi — asl
  nusxa qurilmada saqlanib qoladi, hech narsa oʻchirilmaydi. Endi bir necha qurilmada kirsangiz,
  ma'lumotlaringiz barchasida bir xil bo'ladi.
- **Tariflar**: Bepul / Premium / Mega Premium taqqoslash sahifasi (loyiha; hozircha hech narsa qulflanmagan)
- Yorugʻ / qorongʻi mavzu, toast, modal, skeleton, boʻsh va xato holatlari, klaviatura va ekran oʻquvchi qoʻllovi
- Maʼlumotlar `localStorage` da adapter orqali saqlanadi: keyinchalik serverga oʻtganda faqat adapter almashadi
- **Xavfsizlik (9-bosqich)**: qatʼiy HTTP sarlavhalari (Helmet CSP/HSTS), CSRF himoyasi (double-submit
  cookie), login/registratsiya uchun tezlik cheklovi (rate limit), DB darajasidagi dublikatlar toza
  409 xato bilan qaytariladi — quyida batafsil

Valyuta kursi endi **haqiqiy** manbadan (CBU). Agar server internetga ulanolmasa yoki CBU javob
bermasa, ilova jimgina demo maʼlumotga oʻtadi va buni "Demo maʼlumot" yoki "Eskirgan" belgisi bilan
ochiq koʻrsatadi — hech qachon xato bermaydi yoki notoʻgʻri raqamni haqiqiy sifatida koʻrsatmaydi.

Birinchi marta ishga tushirishdan oldin tarixiy kurslarni oldindan yuklab olish tavsiya etiladi:

```bash
node scripts/backfillRates.js          # oxirgi 365 kun
node scripts/backfillRates.js --days=90
```

## Loyiha tuzilmasi

```
client/      Brauzer ilovasi (vanilla ES modullar, build bosqichisiz)
  js/core        router, store, mavzu, dom yordamchilari, navigatsiya
  js/data        adapterlar (hozir localStorage, 8-bosqichda REST), repozitoriylar, namunaviy maʼlumot
  js/services    dashboard / tranzaksiya / kategoriya / statistika / tahlil / eksport / tarif / kurs (server API)
  js/components  qayta ishlatiladigan UI (layout/, dashboard/, statistics/, transactions/, insights/, form/)
  js/pages       har bir marshrut uchun bitta modul
  js/i18n        uz.js: barcha interfeys matni
shared/      Client VA server ishlatadigan sof mantiq: pul, sana, statistika, tahlillar, validatsiya,
             qidiruv, eksport, davrlar, tariflar, xabarlar
server/      Express: statik fayllar + /api/v1/health + /api/v1/exchange/*
  providers/exchange   CBU (haqiqiy API) va demo provayderlar
  services/exchange*   zanjir (kesh -> CBU -> zaxira -> demo) va fayl-kesh
scripts/     backfillRates.js: tarixiy kurslarni oldindan yuklash
tests/       node:test birlik testlari
```

## Til qoidalari

- Foydalanuvchiga koʻrinadigan **barcha** matn `client/js/i18n/uz.js` da. Kodda matn yozilmaydi, `t('kalit')` ishlatiladi.
- Validatsiya xabarlari `shared/messages.js` da (kod + oʻzbekcha matn), server ham shuni qaytaradi.
- Kategoriya nomlari `shared/constants.js`, tarif matnlari `shared/plans.js` da.
- Imlo: `oʻ`, `gʻ` uchun **ʻ** (U+02BB), tutuq belgisi uchun **ʼ** (U+02BC). Oddiy `'` ishlatilmaydi.
  `tests/i18n.test.js` buni, shuningdek kalitlar butunligini avtomatik tekshiradi.
- Qidiruv apostrofning barcha turlariga befarq ("sovg'alar" = "Sovgʻalar").
- Kod identifikatorlari va JSON kalitlari texnik (inglizcha, camelCase) qoladi.

## Qoidalar

- Pul **minor birlikdagi butun son** (x100). Float saqlanmaydi va qoʻshilmaydi.
- Valyutali tranzaksiya yaratilgan paytdagi kursni saqlaydi (`fxRateToBase`), shuning uchun eski hisobotlar oʻzgarmaydi.
- Kun va hafta foydalanuvchi vaqt zonasida (`Asia/Tashkent`) hisoblanadi; hafta dushanbadan boshlanadi.
- Oʻrtacha koʻrsatkichlar faqat **oʻtib ketgan kunlarga** boʻlinadi (joriy hafta/oy uchun ham).
- Validatsiya `shared/validators.js` da: client darhol xabar beradi, server esa yakuniy hakam.
- UI hech qachon `innerHTML` ishlatmaydi; matn har doim matn tuguni sifatida qoʻyiladi.
- Ranglar `client/css/tokens.css` dagi CSS oʻzgaruvchilardan olinadi.

## Xavfsizlik (9-bosqich)

- **HTTP sarlavhalari**: [Helmet](https://helmetjs.github.io/) orqali qatʼiy Content-Security-Policy
  (faqat `'self'`, hech qanday tashqi CDN yoʻq — Chart.js ham lokal serverdan beriladi),
  `X-Content-Type-Options`, `X-Frame-Options`, HSTS (faqat ishlab chiqarishda). Kod:
  `server/middleware/security.js`.
- **CSRF himoyasi**: "double-submit cookie" naqshi. Server har javobda `finora_csrf` cookie
  (httpOnly EMAS) oʻrnatadi; klient uni `X-CSRF-Token` sarlavhasida qaytarishi shart — aks holda
  POST/PATCH/DELETE 403 `CSRF_INVALID` bilan rad etiladi. Sessiya cookie allaqachon
  `SameSite=Lax` bilan himoyalangan — bu qoʻshimcha qatlam. Kod: `server/middleware/csrf.js`,
  `client/js/utils/csrf.js`.
- **Tezlik cheklovi (rate limit)**: `/auth/login` va `/auth/register` — bitta IP+email kombinatsiyasi
  `RATE_LIMIT_WINDOW_MS` (sukut: 15 daqiqa) ichida `RATE_LIMIT_MAX` (sukut: 10) martadan koʻp
  urinolmaydi, aks holda 429 `TOO_MANY_REQUESTS` + `Retry-After`. Kod: `server/middleware/rateLimit.js`.
- **Parollar**: `crypto.scrypt` (Node yadrosida, tashqi paketsiz) bilan xeshlanadi, hech qachon
  ochiq matnda saqlanmaydi yoki qaytarilmaydi.
- **SQL-in'ektsiya**: barcha soʻrovlar parametrlangan (`node:sqlite` prepared statements) — qatorlar
  hech qachon qoʻlda birlashtirilmaydi.
- **XSS**: UI hech qachon `innerHTML` ishlatmaydi (yuqoridagi "Qoidalar"ga qarang); CSP bu qoidani
  buzilgan taqdirda ham qoʻshimcha toʻsiq boʻladi.
- **DB darajasidagi dublikatlar**: masalan bir xil kategoriya+davr uchun ikkinchi byudjet endi
  xomaki 500 emas, toza 409 `CONFLICT` bilan rad etiladi (`runOrConflict` yordamchisi,
  `server/controllers/dataController.js`). Import operatsiyasi (`POST /import`) butunlay bitta DB
  tranzaksiyasida (`BEGIN`/`COMMIT`/`ROLLBACK`) ishlaydi — xato chiqsa, HECH NARSA yozilmaydi.
- **Sirlar**: barcha maxfiy sozlamalar `.env` da (`.env.example` namuna) — klient kodida hech qanday
  API kalit yoʻq.
- Muhit oʻzgaruvchilari: `.env.example` ga qarang.

## Ishlab chiqarishga tayyorlash (10-bosqich)

- **Siqish (compression)**: barcha matn javoblari (HTML/CSS/JS/JSON) gzip bilan siqiladi
  (`compression` paketi, `server/app.js`). Tarmoq hajmi sezilarli kamayadi.
- **PDF eksport**: Tranzaksiyalar sahifasidagi "Eksport" menyusida endi CSV/JSON bilan bir qatorda
  **PDF** ham bor — jsPDF + AutoTable orqali, butunlay brauzerda, toʻliq lokal (CDN'siz, CSP
  `script-src 'self'` buzilmaydi). Kod: `shared/exportFormats.js` (sof qator maʼlumoti),
  `client/js/services/exportService.js` (chizish).
- **Docker**: `Dockerfile` (koʻp bosqichli, `node:22-alpine`, root boʻlmagan foydalanuvchi,
  healthcheck) va `.dockerignore` qoʻshildi:
  ```bash
  docker build -t finora .
  docker run -p 3000:3000 -v finora_data:/app/server/data --env-file .env finora
  ```
  > Eslatma: ushbu Docker fayllari shu muhitda (Docker demon mavjud emas) ishga tushirib
  > sinalmadi — sintaksis qoʻlda tekshirildi va standart Node/Alpine naqshiga amal qiladi.
  > Oʻzingizda ishga tushirib koʻrishni tavsiya qilamiz.
- **Sahifalash (pagination)**: `GET /api/v1/transactions?limit=&offset=` endi ixtiyoriy
  sahifalashni qoʻllab-quvvatlaydi (`meta: {total, limit, offset}` qaytaradi). Hozircha klient
  standart oqimda hamon hammasini bir yoʻla olib, oʻzi filtrlaydi — katta va xavfli qayta
  qurishdan saqlanish uchun ataylab ulanmagan, lekin API darajasida tayyor turibdi.
- **Lighthouse-uslubidagi tekshiruv**: meta teglar (`viewport`, `description`, `theme-color`),
  `font-display: swap`, semantik HTML va ekran oʻquvchi qoʻllovi allaqachon avvalgi
  bosqichlardan mavjud edi — qoʻshimcha oʻzgarish talab qilinmadi.

## Litsenziyalar

Manrope shrifti: SIL Open Font License (`client/assets/fonts/OFL-LICENSE.txt`). Chart.js: MIT.
jsPDF va jsPDF-AutoTable: MIT.
#   f i n o r a - a d m i n  
 