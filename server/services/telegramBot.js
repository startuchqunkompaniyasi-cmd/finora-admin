/**
 * services/telegramBot.js
 * Telegram ovozli bot: foydalanuvchi ovozli (yoki matnli) xabar yuboradi -> matnga aylanadi ->
 * `shared/voiceParser.js` tranzaksiyaga aylantiradi -> hisobning oʻziga yoziladi va saytda koʻrinadi.
 * Xato tushunilgan boʻlsa foydalanuvchi "Bekor qilish" tugmasi bilan oʻchira oladi.
 *
 * Hamma tashqi narsa (API, STT, DB, kurs) `deps` orqali beriladi, shuning uchun testlar soxta obyektlar bilan ishlaydi.
 */

import { SYSTEM_CATEGORIES } from '../../shared/constants.js';
import { addDays, todayKey } from '../../shared/dates.js';
import { validateTransactionDraft } from '../../shared/validators.js';
import { parseSpokenTransaction } from '../../shared/voiceParser.js';
import { formatMoneyPlain } from '../../shared/moneyText.js';

const MAX_VOICE_SECONDS = 60;
const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const MAX_BAD_CODES = 5;
const BAD_CODE_WINDOW_MS = 10 * 60_000;

const MSG = {
  welcome: (name) => `✅ Hisobingiz ulandi, ${name}!\n\nEndi xarajat yoki daromadingizni ovozli xabar bilan yuboring, masalan:\n• «Taksiga 30 ming soʻm sarfladim»\n• «Maosh tushdi 5 million soʻm»\n• «Kecha dorixonada 120 ming»\n\nYozuv Finora saytida darhol paydo boʻladi.`,
  notLinked: 'Bu Telegram hali Finora hisobiga ulanmagan.\n\nFinora saytida «Telegram bot» sahifasini oching, «Ulash» tugmasini bosing va chiqqan havola orqali shu yerga qayting.',
  help: 'Ovozli yoki matnli xabar yuboring: «Taksiga 30 ming soʻm».\nDaromad uchun: «Maosh tushdi 5 million».\nDollar uchun: «Kafe 12 dollar».\n«Kecha» desangiz, yozuv kechagi sanaga tushadi.\n\n/stop — hisobni uzish',
  badCode: 'Kod notoʻgʻri yoki eskirgan. Saytdan yangi havola oling.',
  tooManyCodes: 'Juda koʻp notoʻgʻri urinish. Birozdan soʻng qayta urinib koʻring.',
  chatTaken: 'Bu Telegram boshqa Finora hisobiga ulangan. Avval oʻsha yerda /stop yuboring.',
  suspended: 'Hisobingiz vaqtincha toʻxtatilgan. Yordam xizmatiga murojaat qiling.',
  unlinked: 'Hisob uzildi. Qayta ulash uchun saytdagi havoladan foydalaning.',
  noStt: 'Ovozli xabarni tanish hozircha sozlanmagan. Iltimos, xarajatni matn bilan yozing: «Taksi 30 ming soʻm».',
  voiceTooLong: `Ovozli xabar juda uzun (${MAX_VOICE_SECONDS} soniyagacha boʻlsin).`,
  sttFailed: 'Ovozni tanib boʻlmadi. Qayta yuboring yoki matn bilan yozing.',
  empty: 'Ovozdan hech narsa eshitilmadi. Qayta urinib koʻring.',
  noAmount: (heard) => `Summani tushunmadim${heard ? ` (eshitilgani: «${heard}»)` : ''}.\nQayta ayting, masalan: «Taksiga 30 ming soʻm».`,
  rateFail: 'Valyuta kursini olib boʻlmadi. Birozdan soʻng qayta urining yoki soʻmda ayting.',
  saveFail: 'Yozuvni saqlab boʻlmadi. Qayta urinib koʻring.',
  deleted: '🗑 Yozuv oʻchirildi.',
  alreadyGone: 'Bu yozuv allaqachon oʻchirilgan.',
  unsupported: 'Ovozli yoki matnli xabar yuboring.',
};

const categoryName = (id) => SYSTEM_CATEGORIES.find((item) => item.id === id);

export function createTelegramBot({ api, speech = null, telegramRepository, transactionsRepository, getRate, now = () => new Date(), logger = console }) {
  const badCodes = new Map(); // chatId -> [ms]
  let running = false;

  const send = (chatId, text, extra) => api.sendMessage(chatId, text, extra).catch((error) => logger.warn('[finora] Telegram xabar yuborilmadi:', error.message));

  function tooManyBadCodes(chatId) {
    const t = Date.now();
    const recent = (badCodes.get(chatId) ?? []).filter((ms) => t - ms < BAD_CODE_WINDOW_MS);
    badCodes.set(chatId, recent);
    return recent.length >= MAX_BAD_CODES;
  }

  async function handleStart(chatId, from, payload) {
    if (!payload) {
      const linked = telegramRepository.findUserByChat(chatId);
      return send(chatId, linked ? MSG.help : MSG.notLinked);
    }
    if (tooManyBadCodes(chatId)) return send(chatId, MSG.tooManyCodes);
    const userId = telegramRepository.consumeLinkCode(payload);
    if (!userId) {
      badCodes.get(chatId).push(Date.now());
      return send(chatId, MSG.badCode);
    }
    const result = telegramRepository.link(userId, chatId, from?.username);
    if (result.conflict) return send(chatId, MSG.chatTaken);
    const user = telegramRepository.findUserByChat(chatId);
    return send(chatId, MSG.welcome(user?.name ?? ''));
  }

  async function transcribe(message) {
    const media = message.voice ?? message.audio;
    if (!speech) return { error: MSG.noStt };
    if ((media.duration ?? 0) > MAX_VOICE_SECONDS) return { error: MSG.voiceTooLong };
    if ((media.file_size ?? 0) > MAX_VOICE_BYTES) return { error: MSG.voiceTooLong };
    try {
      const { buffer, path } = await api.downloadFile(media.file_id);
      const text = await speech.transcribe(buffer, { filename: path?.split('/').pop() || 'voice.ogg', mimeType: media.mime_type || 'audio/ogg' });
      return text ? { text } : { error: MSG.empty };
    } catch (error) {
      logger.warn('[finora] Ovozni matnga aylantirib boʻlmadi:', error.message);
      return { error: MSG.sttFailed };
    }
  }

  /** Matndan tranzaksiya yaratadi va javob yuboradi. */
  async function recordFromText(chatId, user, text, source) {
    const parsed = parseSpokenTransaction(text);
    if (!parsed.ok) return send(chatId, MSG.noAmount(parsed.description.slice(0, 80)));

    const currency = parsed.currency ?? user.baseCurrency;
    let fxRate = null;
    let fxRateSource = null;
    if (currency !== user.baseCurrency) {
      try {
        ({ rate: fxRate, source: fxRateSource } = await getRate(currency, user.baseCurrency));
      } catch (error) {
        logger.warn('[finora] Kurs olinmadi:', error.message);
        return send(chatId, MSG.rateFail);
      }
    }

    const current = now();
    const date = addDays(todayKey(user.timezone, current), parsed.dayOffset);
    const draft = {
      type: parsed.type,
      amount: parsed.amount,
      currency,
      categoryId: parsed.categoryId,
      description: parsed.description,
      note: source === 'voice' ? 'Telegram: ovozli xabar' : 'Telegram: matnli xabar',
      paymentMethod: 'other',
      date,
      time: parsed.dayOffset === 0 ? undefined : '12:00',
    };
    // Bugungi yozuv: hozirgi vaqt (kelajak xatosi chiqmasligi uchun `now` dan olinadi).
    if (parsed.dayOffset === 0) {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: user.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(current);
      draft.time = parts;
    }

    const result = validateTransactionDraft(draft, { timezone: user.timezone, baseCurrency: user.baseCurrency, categories: SYSTEM_CATEGORIES, fxRate, now: current });
    if (!result.ok) {
      const first = Object.values(result.errors)[0];
      return send(chatId, `Yozib boʻlmadi: ${first}`);
    }

    let saved;
    try {
      saved = transactionsRepository.create(user.id, { ...result.value, fxRateSource: result.value.fxRateToBase ? fxRateSource : null });
    } catch (error) {
      logger.error('[finora] Bot tranzaksiyani saqlay olmadi:', error);
      return send(chatId, MSG.saveFail);
    }

    const category = categoryName(saved.categoryId);
    const sign = saved.type === 'income' ? '➕ Kirim' : '➖ Chiqim';
    const lines = [
      `${sign}: ${formatMoneyPlain(saved.amount, saved.currency)}`,
      `${category?.icon ?? ''} ${category?.name ?? saved.categoryId}`.trim(),
      `📅 ${date}`,
      '',
      `Eshitildi: «${text.length > 100 ? `${text.slice(0, 99)}…` : text}»`,
    ];
    return send(chatId, lines.join('\n'), { reply_markup: { inline_keyboard: [[{ text: '🗑 Bekor qilish', callback_data: `del:${saved.id}` }]] } });
  }

  async function handleMessage(message) {
    const chatId = message.chat?.id;
    if (chatId === undefined || message.chat.type !== 'private') return; // guruhlarda ishlamaydi

    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const command = /^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/.exec(text);

    if (command?.[1] === 'start') return handleStart(chatId, message.from, (command[2] ?? '').trim());
    if (command?.[1] === 'help') return send(chatId, MSG.help);

    const user = telegramRepository.findUserByChat(chatId);
    if (command?.[1] === 'stop') {
      telegramRepository.unlinkByChat(chatId);
      return send(chatId, MSG.unlinked);
    }
    if (!user) return send(chatId, MSG.notLinked);
    if (user.status === 'suspended') return send(chatId, MSG.suspended);

    if (message.voice || message.audio) {
      const result = await transcribe(message);
      if (result.error) return send(chatId, result.error);
      return recordFromText(chatId, user, result.text, 'voice');
    }
    if (text && !command) return recordFromText(chatId, user, text, 'text');
    return send(chatId, MSG.unsupported);
  }

  async function handleCallback(query) {
    const chatId = query.message?.chat?.id;
    const data = String(query.data ?? '');
    const answer = (text) => api.answerCallbackQuery(query.id, text).catch(() => {});
    if (chatId === undefined || !data.startsWith('del:')) return answer();

    const user = telegramRepository.findUserByChat(chatId);
    if (!user || user.status === 'suspended') return answer(MSG.notLinked);

    const id = data.slice(4);
    const existing = transactionsRepository.get(user.id, id); // faqat shu foydalanuvchining yozuvi
    if (!existing) return answer(MSG.alreadyGone);
    transactionsRepository.remove(user.id, id);
    await answer(MSG.deleted);
    await api.editMessageReplyMarkup(chatId, query.message.message_id).catch(() => {});
    return send(chatId, MSG.deleted);
  }

  async function handleUpdate(update) {
    try {
      if (update.message) await handleMessage(update.message);
      else if (update.callback_query) await handleCallback(update.callback_query);
    } catch (error) {
      logger.error('[finora] Telegram yangilanishini qayta ishlashda xato:', error);
    }
  }

  async function poll() {
    let offset;
    while (running) {
      try {
        const updates = await api.getUpdates(offset);
        for (const update of updates) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      } catch (error) {
        logger.warn('[finora] Telegram soʻrovi xato:', error.message);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // tarmoq xatosida toʻxtovsiz aylanmaslik uchun
      }
    }
  }

  return {
    handleUpdate,
    async start() {
      if (running) return null;
      const me = await api.getMe();
      await api.call('deleteWebhook').catch(() => {}); // getUpdates webhook bilan ishlamaydi
      running = true;
      poll();
      return me;
    },
    stop() {
      running = false;
    },
  };
}
