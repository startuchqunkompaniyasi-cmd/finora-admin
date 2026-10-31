/**
 * admin/uz.js - admin paneli matnlari (oʻzbek, lotin). Kalitlar `adm.` bilan boshlanadi.
 * Imlo: oʻ/gʻ uchun ʻ (U+02BB), tutuq uchun ʼ (U+02BC).
 */

export default {
  'adm.panel': 'Boshqaruv paneli', 'adm.skip': 'Asosiy kontentga oʻtish', 'adm.logout': 'Chiqish',
  'adm.themeDark': 'Qorongʻi mavzuga oʻtish', 'adm.themeLight': 'Yorugʻ mavzuga oʻtish',
  'adm.loading': 'Yuklanmoqda…', 'adm.loadFailed': 'Panel yuklanmadi.', 'adm.notFound': 'Sahifa topilmadi', 'adm.notFoundHint': 'Bunday boshqaruv sahifasi mavjud emas.',
  'adm.mustChange': 'Siz boshlangʻich paroldan foydalanyapsiz. Xavfsizlik uchun parolni hoziroq almashtiring.', 'adm.changeNow': 'Almashtirish',

  'adm.nav.label': 'Admin navigatsiyasi', 'adm.nav.home': 'Bosh sahifa', 'adm.nav.homeShort': 'Bosh', 'adm.nav.users': 'Foydalanuvchilar', 'adm.nav.usersShort': 'Mijozlar',
  'adm.nav.tariffs': 'Tariflar', 'adm.nav.payments': 'Toʻlovlar', 'adm.nav.settings': 'Sozlamalar', 'adm.nav.more': 'Yana',
  'adm.nav.analytics': 'Analitika', 'adm.nav.notifications': 'Bildirishnomalar', 'adm.nav.audit': 'Audit jurnali', 'adm.nav.system': 'Tizim holati', 'adm.nav.profile': 'Admin profili',

  'adm.login.title': 'Boshqaruv paneli', 'adm.login.subtitle': 'Davom etish uchun administrator maʼlumotlarini kiriting.',
  'adm.login.username': 'Login', 'adm.login.password': 'Parol', 'adm.login.submit': 'Kirish',
  'adm.login.incomplete': 'Avval login va parolni kiriting.', 'adm.login.failed': 'Kirib boʻlmadi. Qayta urinib koʻring.', 'adm.login.back': 'Finora ilovasiga qaytish',

  'adm.save': 'Saqlash', 'adm.saved': 'Saqlandi.', 'adm.cancel': 'Bekor qilish', 'adm.confirm': 'Tasdiqlash', 'adm.delete': 'Oʻchirish', 'adm.edit': 'Tahrirlash', 'adm.back': 'Orqaga',
  'adm.apply': 'Qoʻllash', 'adm.refresh': 'Yangilash', 'adm.all': 'Hammasi', 'adm.details': 'Batafsil', 'adm.yes': 'Ha', 'adm.no': 'Yoʻq', 'adm.on': 'Yoqilgan', 'adm.off': 'Oʻchiq',
  'adm.ok': 'Yaxshi', 'adm.bad': 'Xato', 'adm.never': 'Hech qachon', 'adm.empty': 'Hozircha maʼlumot yoʻq.', 'adm.unavailable': 'Mavjud emas', 'adm.demo': 'Namuna', 'adm.days': '{n} kun', 'adm.unlimited': 'Cheksiz',
  'adm.reason': 'Sabab', 'adm.reasonHint': 'Kamida 5 belgi. Sabab audit jurnaliga yoziladi.', 'adm.reasonShort': 'Sababni kamida 5 belgi bilan yozing.',
  'adm.from': 'Dan', 'adm.to': 'Gacha', 'adm.range': 'Oraliq', 'adm.lastDays': 'Oxirgi {n} kun',
  'adm.total': 'Jami: {n}', 'adm.pageOf': '{page}/{pages}-sahifa · jami {total}', 'adm.pagination': 'Sahifalash', 'adm.prev': 'Oldingi', 'adm.next': 'Keyingi',
  'adm.ago.now': 'hozir', 'adm.ago.minutes': '{n} daqiqa oldin', 'adm.ago.hours': '{n} soat oldin', 'adm.ago.days': '{n} kun oldin',
  'adm.noChartData': 'Bu oraliq uchun maʼlumot yoʻq.', 'adm.chartFailed': 'Grafikni chizib boʻlmadi.',

  'adm.col.name': 'Ism', 'adm.col.plan': 'Tarif', 'adm.col.status': 'Holat', 'adm.col.registered': 'Roʻyxatdan oʻtgan', 'adm.col.lastActive': 'Oxirgi faollik', 'adm.col.txCount': 'Tranzaksiyalar',
  'adm.col.user': 'Foydalanuvchi', 'adm.col.type': 'Turi', 'adm.col.amount': 'Summa', 'adm.col.date': 'Sana', 'adm.col.category': 'Kategoriya', 'adm.col.admin': 'Admin',
  'adm.status.active': 'Faol', 'adm.status.suspended': 'Toʻxtatilgan', 'adm.type.income': 'Daromad', 'adm.type.expense': 'Xarajat',
  'adm.period.daily': 'Kunlik', 'adm.period.monthly': 'Oylik', 'adm.period.yearly': 'Yillik',

  'adm.dash.subtitle': 'FINORA ning jonli koʻrsatkichlari.', 'adm.dash.volumeNote': 'Daromad va xarajat — foydalanuvchilarning shaxsiy yozuvlari yigʻindisi, FINORA daromadi emas.',
  'adm.stat.totalUsers': 'Foydalanuvchilar', 'adm.stat.suspended': 'Toʻxtatilgan: {n}', 'adm.stat.activeUsers': 'Faol foydalanuvchilar', 'adm.stat.active30': 'Oxirgi 30 kunda',
  'adm.stat.newToday': 'Bugun yangi', 'adm.stat.newWeekMonth': 'Hafta: {w} · oy: {m}', 'adm.stat.transactions': 'Tranzaksiyalar', 'adm.stat.txRange': 'Tanlangan oraliqda: {n}',
  'adm.stat.revenue': 'Daromad', 'adm.stat.outstanding': 'Qarzdorlik', 'adm.stat.noBilling': 'Toʻlov tizimi hali yoʻq',
  'adm.chart.growth': 'Foydalanuvchilar oʻsishi', 'adm.chart.newUsers': 'Yangi', 'adm.chart.totalUsers': 'Jami', 'adm.chart.activity': 'Yaratilgan tranzaksiyalar', 'adm.chart.txCreated': 'Tranzaksiyalar',
  'adm.tariffDist': 'Tariflar boʻyicha', 'adm.noUsersYet': 'Hozircha foydalanuvchi yoʻq.', 'adm.noTxYet': 'Hozircha tranzaksiya yoʻq.', 'adm.noTxRange': 'Bu oraliqda tranzaksiya yoʻq.', 'adm.volume': 'Yozuvlar hajmi',
  'adm.recentUsers': 'Soʻnggi roʻyxatdan oʻtganlar', 'adm.recentTx': 'Soʻnggi tranzaksiyalar', 'adm.recentAudit': 'Soʻnggi admin amallari', 'adm.noAudit': 'Hozircha amal yoʻq.',
  'adm.health': 'Tizim holati', 'adm.health.db': 'Maʼlumotlar bazasi', 'adm.health.dbSize': 'Baza hajmi', 'adm.health.migrations': 'Migratsiyalar',

  'adm.users.subtitle': 'Roʻyxatdan oʻtgan hisoblar.', 'adm.users.search': 'Qidirish', 'adm.users.searchPlaceholder': 'Ism, email yoki ID', 'adm.users.allStatuses': 'Barcha holatlar', 'adm.users.allPlans': 'Barcha tariflar',
  'adm.users.sort': 'Saralash', 'adm.users.export': 'CSV yuklab olish', 'adm.users.none': 'Hozircha foydalanuvchi yoʻq.', 'adm.users.noMatches': 'Hech narsa topilmadi.',
  'adm.sort.newest': 'Eng yangi', 'adm.sort.oldest': 'Eng eski', 'adm.sort.nameAsc': 'Ism (A–Z)', 'adm.sort.lastActive': 'Oxirgi faollik', 'adm.sort.mostTx': 'Koʻp tranzaksiya',

  'adm.user.notFound': 'Foydalanuvchi topilmadi.', 'adm.user.profile': 'Profil', 'adm.user.currency': 'Asosiy valyuta', 'adm.user.timezone': 'Vaqt zonasi',
  'adm.user.balance': 'Balans', 'adm.user.opening': 'Boshlangʻich', 'adm.user.income': 'Daromad', 'adm.user.expense': 'Xarajat', 'adm.user.unconverted': '{n} ta yozuv kursi yoʻqligi uchun hisobga olinmadi.',
  'adm.user.balanceNote': 'Balans foydalanuvchining oʻz yozuvlaridan hisoblanadi. Admin uni oʻzgartira olmaydi.',
  'adm.user.usage': 'Foydalanish', 'adm.user.transactions': 'Tranzaksiyalar', 'adm.user.budgets': 'Byudjetlar', 'adm.user.goals': 'Maqsadlar', 'adm.user.sessions': 'Faol seanslar', 'adm.user.onboarded': 'Boshlangʻich sozlash',
  'adm.user.lastTx': 'Soʻnggi tranzaksiyalar',
  'adm.user.edit': 'Tahrirlash', 'adm.user.editNote': 'Faqat ism va email oʻzgartiriladi. Parol va boshqa maxfiy maʼlumotlar admin uchun mavjud emas.',
  'adm.user.changePlan': 'Tarifni oʻzgartirish', 'adm.user.planNote': 'Tarif faqat shu foydalanuvchi uchun oʻzgaradi va audit jurnaliga yoziladi.', 'adm.user.samePlan': 'Boshqa tarifni tanlang.',
  'adm.user.suspend': 'Toʻxtatish', 'adm.user.suspendTitle': 'Hisobni toʻxtatish', 'adm.user.suspendMsg': '{name} tizimga kira olmaydi va barcha seanslari tugaydi. Davom etasizmi?',
  'adm.user.reactivate': 'Qayta faollashtirish', 'adm.user.reactivateTitle': 'Hisobni faollashtirish', 'adm.user.reactivateMsg': '{name} yana tizimga kira oladi.',
  'adm.user.suspendedNote': 'Bu hisob toʻxtatilgan.',

  'adm.tariff.subtitle': 'Tariflar, narxlar va cheklovlar.', 'adm.tariff.new': 'Yangi tarif', 'adm.tariff.editTitle': '{name}: tahrirlash', 'adm.tariff.id': 'ID', 'adm.tariff.idHint': 'Kichik lotin harflari, raqam va tire. Keyin oʻzgartirib boʻlmaydi.',
  'adm.tariff.name': 'Nomi', 'adm.tariff.description': 'Tavsif', 'adm.tariff.price': 'Narx (soʻm)', 'adm.tariff.priceHint': 'Butun soʻmda. 0 — bepul yoki narx belgilanmagan.', 'adm.tariff.period': 'Hisob davri',
  'adm.tariff.trial': 'Sinov muddati (kun)', 'adm.tariff.trialHint': '0 — sinov muddati yoʻq.', 'adm.tariff.limitBudgets': 'Byudjetlar limiti', 'adm.tariff.limitGoals': 'Maqsadlar limiti', 'adm.tariff.limitHint': 'Boʻsh qoldirsangiz — cheksiz.',
  'adm.tariff.active': 'Faol', 'adm.tariff.activeHint': 'Nofaol tarif yangi foydalanuvchilarga taklif qilinmaydi.', 'adm.tariff.inactive': 'Nofaol', 'adm.tariff.default': 'Standart', 'adm.tariff.builtin': 'Tizim tarifi',
  'adm.tariff.reasonHint': 'Narx yoki holat oʻzgarsa majburiy (kamida 5 belgi).', 'adm.tariff.subscribers': 'Obunachilar', 'adm.tariff.subscribersNote': 'Bu tarifda {n} ta foydalanuvchi bor. Ularning tarifi oʻzgarmaydi.',
  'adm.tariff.free': 'Bepul', 'adm.tariff.noPrice': 'Narx belgilanmagan',
  'adm.tariff.preview': 'Koʻrib chiqish', 'adm.tariff.previewTitle': 'Oʻzgarishlarni tekshiring', 'adm.tariff.field': 'Maydon', 'adm.tariff.before': 'Oldin', 'adm.tariff.after': 'Keyin',
  'adm.tariff.publish': 'Chop etish', 'adm.tariff.create': 'Yaratish',
  'adm.tariff.existingRule': 'Mavjud {n} ta obunachining tarifi va toʻlovi oʻzgarmaydi. Yangi narx faqat yangi tanlovlarga qoʻllanadi.',
  'adm.tariff.deactivateWarn': 'Tarif nofaol qilinadi. {n} ta foydalanuvchi uni saqlab qoladi, lekin yangilari tanlay olmaydi.',
  'adm.tariff.history': 'Narx tarixi', 'adm.tariff.historyTitle': '{name}: narx tarixi', 'adm.tariff.noHistory': 'Narx hali oʻzgartirilmagan.',
  'adm.tariff.deleteTitle': 'Tarifni oʻchirish', 'adm.tariff.deleteMsg': '"{name}" tarifi butunlay oʻchiriladi. Bu amalni qaytarib boʻlmaydi.',
  'adm.tariff.errPrice': 'Narx butun musbat son boʻlishi kerak.', 'adm.tariff.errTrial': 'Sinov muddati 0–365 kun.', 'adm.tariff.errName': 'Nom kamida 2 belgi.', 'adm.tariff.errLimit': 'Limit butun son boʻlishi kerak.', 'adm.tariff.errId': 'ID notoʻgʻri (2–30 belgi, lotin kichik harf, raqam, tire).',
  'adm.tariff.unpricedNote': 'Pullik tariflarga hali narx belgilanmagan. Narxni mahsulot egasi tasdiqlagach kiriting.',
  'adm.tariff.rule': 'Qoida: narx yoki holat oʻzgarishi mavjud obunachilarning tarifini jimgina oʻzgartirmaydi. Foydalanuvchi tarifini faqat admin alohida, sabab bilan oʻzgartiradi.',
  'adm.tariff.appNote': 'Hozircha toʻlov tizimi yoʻq: narxlar saqlanadi va tarixi yuritiladi, lekin foydalanuvchilardan pul yechilmaydi.',

  'adm.pay.subtitle': 'Toʻlov tizimi va tranzaksiya yozuvlari.', 'adm.pay.noSystemTitle': 'Toʻlov tizimi', 'adm.pay.noSystem': 'FINORA da hozircha toʻlov tizimi yoʻq (rejada). Shuning uchun toʻlovlar, qaytarishlar va balansni tuzatish mavjud emas va maʼlumot toʻqib chiqarilmaydi.',
  'adm.pay.na1': 'Toʻlov va qaytarish yozuvlari', 'adm.pay.na2': 'Admin tomonidan balans tuzatish', 'adm.pay.na3': 'Toʻlov holati (kutilmoqda, muvaffaqiyatli, rad etilgan)',
  'adm.pay.tableTitle': 'Foydalanuvchi tranzaksiyalari', 'adm.pay.readonly': 'Bu foydalanuvchilarning shaxsiy daromad/xarajat yozuvlari. Faqat oʻqish; tavsif va izohlar koʻrsatilmaydi.',
  'adm.pay.user': 'Foydalanuvchi', 'adm.pay.userPlaceholder': 'Foydalanuvchi ismi, email yoki ID', 'adm.pay.txId': 'Tranzaksiya ID', 'adm.pay.allTypes': 'Barcha turlar', 'adm.pay.allCurrencies': 'Barcha valyutalar', 'adm.pay.none': 'Tranzaksiya topilmadi.',

  'adm.set.subtitle': 'Ilovaga ulangan sozlamalar.', 'adm.set.site': 'Sayt', 'adm.set.siteName': 'Sayt nomi', 'adm.set.siteDesc': 'Qisqa tavsif',
  'adm.set.access': 'Kirish rejimlari', 'adm.set.accessHint': 'Ilovaning foydalanuvchilarga ochiqligini boshqaradi.', 'adm.set.maintenance': 'Texnik ishlar rejimi', 'adm.set.maintenanceHint': 'Yoqilsa, foydalanuvchi API soʻrovlari vaqtincha toʻxtaydi. Admin panel ishlaydi.',
  'adm.set.maintMsg': 'Texnik ishlar xabari', 'adm.set.maintConfirmTitle': 'Texnik ishlar rejimini yoqish', 'adm.set.maintConfirm': 'Foydalanuvchilar hisob va sinxronlash bilan ishlay olmaydi. Davom etasizmi?', 'adm.set.maintEnable': 'Yoqish',
  'adm.set.registration': 'Roʻyxatdan oʻtish ochiq', 'adm.set.registrationHint': 'Oʻchirilsa, yangi hisob yaratib boʻlmaydi.',
  'adm.set.announcement': 'Eʼlon', 'adm.set.announcementHint': 'Yoqilsa, ilovaning tepasida koʻrsatiladi (oddiy matn).', 'adm.set.announce': 'Eʼlonni koʻrsatish', 'adm.set.announceHint': 'Matn HTML sifatida emas, oddiy matn sifatida chiqadi.', 'adm.set.announceText': 'Eʼlon matni',
  'adm.set.defaults': 'Standart sozlamalar', 'adm.set.defaultsHint': 'Yangi roʻyxatdan oʻtganlarga beriladigan tarif.', 'adm.set.defaultTariff': 'Standart tarif',
  'adm.set.legal': 'Hujjatlar', 'adm.set.legalHint': 'Foydalanish shartlari va maxfiylik siyosati matni saqlanadi.', 'adm.set.terms': 'Foydalanish shartlari', 'adm.set.privacy': 'Maxfiylik siyosati',
  'adm.set.unsupported': 'Hozircha mavjud emas: email bildirishnomalari, logotip va favicon, brend ranglari, funksiyalarni yoqish/oʻchirish. Ular ilovaga xavfsiz ulanmaguncha bu yerda koʻrsatilmaydi.',

  'adm.an.subtitle': 'Foydalanish koʻrsatkichlari.', 'adm.an.dau': 'Oxirgi 24 soat', 'adm.an.wau': 'Oxirgi 7 kun', 'adm.an.mau': 'Oxirgi 30 kun', 'adm.an.neverActive': 'Faolligi yoʻq', 'adm.an.neverHint': 'Faollik hali qayd etilmagan',
  'adm.an.trend': 'Faollik va roʻyxatdan oʻtish', 'adm.an.creators': 'Yozuv qoʻshganlar', 'adm.an.signups': 'Yangi hisoblar', 'adm.an.txTrend': 'Yaratilgan tranzaksiyalar',
  'adm.an.newReturning': 'Yangi va qaytgan', 'adm.an.new': 'Yangi foydalanuvchilar', 'adm.an.returning': 'Qaytgan foydalanuvchilar', 'adm.an.newReturningNote': 'Davr ichida yozuv qoʻshganlar, roʻyxatdan oʻtgan vaqtiga qarab.',
  'adm.an.features': 'Imkoniyatlar (yangi yozuvlar)', 'adm.an.limits': 'Limitlarga yetganlar', 'adm.an.limitRow': '{feature}: {limit} ({tariff})', 'adm.an.noLimits': 'Cheklangan tarif limiti yoʻq.',
  'adm.an.f.budgets': 'Byudjetlar', 'adm.an.f.goals': 'Maqsadlar', 'adm.an.byTariff': 'Tariflar boʻyicha', 'adm.an.users': 'Foydalanuvchilar', 'adm.an.txPeriod': 'Tranzaksiyalar (davr)',
  'adm.an.unavailable': 'Sahifa koʻrishlari va seanslar tarixi maxfiylik uchun yigʻilmaydi. DAU/WAU/MAU oxirgi faollik vaqtidan hisoblanadi (hozirgi holat), tarixiy grafiklar esa haqiqiy yozuvlardan.',

  'adm.notif.subtitle': 'Soʻnggi hodisalar.', 'adm.notif.failed24': 'Oxirgi 24 soatda {n} ta muvaffaqiyatsiz kirish urinishi.', 'adm.notif.none': 'Yangi bildirishnoma yoʻq.',
  'adm.notif.registration': 'Yangi foydalanuvchi: {name}', 'adm.notif.error': 'Server xatosi: {message}', 'adm.notif.failedLogins': 'Admin kirishida {n} ta muvaffaqiyatsiz urinish', 'adm.notif.action': '{action} · {actor} {target}',

  'adm.audit.subtitle': 'Maxfiy amallar jurnali.', 'adm.audit.action': 'Amal', 'adm.audit.allActions': 'Barcha amallar', 'adm.audit.record': 'Yozuv', 'adm.audit.details': 'Tafsilot', 'adm.audit.result': 'Natija',
  'adm.audit.note': 'Jurnal faqat qoʻshiladi: yozuvlarni oʻzgartirib yoki oʻchirib boʻlmaydi. Parollar va tokenlar yozilmaydi.',
  'adm.action.admin.login': 'Admin kirishi', 'adm.action.admin.logout': 'Admin chiqishi', 'adm.action.admin.password_change': 'Admin paroli almashtirildi', 'adm.action.admin.username_change': 'Admin logini almashtirildi', 'adm.action.admin.sessions_revoked': 'Boshqa seanslar tugatildi',
  'adm.action.user.update': 'Foydalanuvchi tahrirlandi', 'adm.action.user.suspend': 'Hisob toʻxtatildi', 'adm.action.user.reactivate': 'Hisob faollashtirildi', 'adm.action.user.plan_change': 'Foydalanuvchi tarifi oʻzgartirildi', 'adm.action.users.export': 'Foydalanuvchilar eksporti',
  'adm.action.tariff.create': 'Tarif yaratildi', 'adm.action.tariff.update': 'Tarif yangilandi', 'adm.action.tariff.price_change': 'Tarif narxi oʻzgartirildi', 'adm.action.tariff.delete': 'Tarif oʻchirildi', 'adm.action.settings.update': 'Sozlamalar yangilandi',

  'adm.sys.subtitle': 'Server va baza holati.', 'adm.sys.services': 'Xizmatlar', 'adm.sys.maintenance': 'Texnik ishlar rejimi', 'adm.sys.server': 'Server', 'adm.sys.env': 'Muhit', 'adm.sys.uptime': 'Ishlash vaqti', 'adm.sys.memory': 'Xotira',
  'adm.sys.tables': 'Jadvallar (yozuvlar soni)', 'adm.sys.errors': 'Soʻnggi server xatolari', 'adm.sys.noErrors': 'Serverni ishga tushirgandan beri xato qayd etilmagan.',
  'adm.sys.backup': 'Zaxira: SQLite fayli (server/data/finora.db va -wal/-shm) ni muntazam nusxalang. Migratsiyalar server ishga tushganda avtomatik bajariladi.',

  'adm.prof.signedInAs': 'Kirgan: {name}', 'adm.prof.password': 'Parolni almashtirish', 'adm.prof.username': 'Loginni almashtirish', 'adm.prof.currentPw': 'Joriy parol', 'adm.prof.newPw': 'Yangi parol', 'adm.prof.confirmPw': 'Yangi parolni tasdiqlang',
  'adm.prof.pwHint': 'Kamida 12 belgi; kichik harf, bosh harf, raqam va belgidan kamida uchtasi.', 'adm.prof.changePw': 'Parolni almashtirish', 'adm.prof.pwChanged': 'Parol almashtirildi. Boshqa seanslar tugatildi.', 'adm.prof.newUsername': 'Yangi login',
  'adm.prof.sessions': 'Seanslar', 'adm.prof.device': 'Qurilma', 'adm.prof.current': 'Joriy', 'adm.prof.started': 'Boshlangan', 'adm.prof.lastSeen': 'Oxirgi faollik', 'adm.prof.revokeOthers': 'Boshqa seanslarni tugatish', 'adm.prof.revoked': 'Boshqa seanslar tugatildi.',
  'adm.prof.loginActivity': 'Kirish tarixi', 'adm.prof.failedLogin': 'Muvaffaqiyatsiz', 'adm.prof.no2fa': 'Ikki bosqichli autentifikatsiya (2FA) hozircha qoʻllab-quvvatlanmaydi.',
};
