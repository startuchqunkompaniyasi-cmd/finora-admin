/**
 * Telegram bot: ulash, ovoz/matn -> tranzaksiya, bekor qilish, himoya. Soxta API/STT, xotiradagi baza.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../../server/database/db.js';
import { createUsersRepository } from '../../server/repositories/usersRepository.js';
import { createTransactionsRepository } from '../../server/repositories/transactionsRepository.js';
import { createTelegramRepository } from '../../server/repositories/telegramRepository.js';
import { createTelegramBot } from '../../server/services/telegramBot.js';

let db, users, txs, tg, sent, callbacks, speechText, bot, user;
const NOW = new Date('2026-10-30T10:00:00Z');
const silent = { warn() {}, error() {}, log() {} };

beforeEach(() => {
  db = createTestDb();
  users = createUsersRepository(db);
  txs = createTransactionsRepository(db);
  tg = createTelegramRepository(db);
  user = users.create({ name: 'Ali', email: 'ali@test.uz', passwordHash: 'x' });
  sent = [];
  callbacks = [];
  speechText = 'Taksiga 30 ming soʻm sarfladim';
  const api = {
    sendMessage: async (chatId, text, extra) => sent.push({ chatId, text, extra }),
    answerCallbackQuery: async (id, text) => callbacks.push({ id, text }),
    editMessageReplyMarkup: async () => {},
    downloadFile: async () => ({ buffer: Buffer.from('x'), path: 'voice/a.oga' }),
  };
  bot = createTelegramBot({
    api,
    speech: { transcribe: async () => speechText },
    telegramRepository: tg,
    transactionsRepository: txs,
    getRate: async () => ({ rate: 12_500, source: 'cbu' }),
    now: () => NOW,
    logger: silent,
  });
});

const msg = (extra) => ({ update_id: 1, message: { chat: { id: 100, type: 'private' }, from: { username: 'ali' }, ...extra } });
async function link() {
  const { code } = tg.createLinkCode(user.id);
  await bot.handleUpdate(msg({ text: `/start ${code}` }));
}

test('ulanmagan chat: yozuv yaratilmaydi, ulash yoʻriqnomasi', async () => {
  await bot.handleUpdate(msg({ text: 'taksi 30 ming' }));
  assert.match(sent[0].text, /ulanmagan/);
  assert.equal(txs.count(user.id), 0);
});

test('/start <kod> hisobni ulaydi, kod bir martalik', async () => {
  const { code } = tg.createLinkCode(user.id);
  await bot.handleUpdate(msg({ text: `/start ${code}` }));
  assert.match(sent[0].text, /ulandi, Ali/);
  assert.equal(tg.getByUser(user.id).chatId, '100');
  await bot.handleUpdate(msg({ text: `/start ${code}` }));
  assert.match(sent[1].text, /notoʻgʻri/);
});

test('eskirgan kod rad etiladi', () => {
  const { code } = tg.createLinkCode(user.id, Date.now() - 11 * 60_000);
  assert.equal(tg.consumeLinkCode(code), null);
});

test('ovozli xabar -> chiqim tranzaksiyasi (soʻmda, x100)', async () => {
  await link();
  await bot.handleUpdate(msg({ voice: { file_id: 'f', duration: 4, file_size: 1000 } }));
  const [tx] = txs.list(user.id);
  assert.equal(tx.type, 'expense');
  assert.equal(tx.amount, 3_000_000);
  assert.equal(tx.currency, 'UZS');
  assert.equal(tx.categoryId, 'transport');
  assert.equal(tx.note, 'Telegram: ovozli xabar');
  assert.match(sent.at(-1).extra.reply_markup.inline_keyboard[0][0].callback_data, /^del:/);
});

test('dollar: kurs saqlanadi; "kecha" oldingi sanaga yoziladi', async () => {
  await link();
  await bot.handleUpdate(msg({ text: 'kecha kafe 12 dollar' }));
  const [tx] = txs.list(user.id);
  assert.equal(tx.currency, 'USD');
  assert.equal(tx.fxRateToBase, 12_500);
  assert.equal(tx.occurredAt.slice(0, 10), '2026-10-29');
});

test('summa tushunilmasa saqlanmaydi', async () => {
  await link();
  await bot.handleUpdate(msg({ text: 'salom' }));
  assert.match(sent.at(-1).text, /Summani tushunmadim/);
  assert.equal(txs.count(user.id), 0);
});

test('"Bekor qilish" faqat oʻz yozuvini oʻchiradi', async () => {
  await link();
  await bot.handleUpdate(msg({ text: 'taksi 30 ming' }));
  const id = txs.list(user.id)[0].id;
  const other = users.create({ name: 'Vali', email: 'vali@test.uz', passwordHash: 'x' });
  tg.link(other.id, '200', 'vali');
  await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c1', data: `del:${id}`, message: { chat: { id: 200 }, message_id: 1 } } });
  assert.equal(txs.count(user.id), 1, 'boshqa foydalanuvchi oʻchira olmaydi');
  await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c2', data: `del:${id}`, message: { chat: { id: 100 }, message_id: 1 } } });
  assert.equal(txs.count(user.id), 0);
});

test('toʻxtatilgan hisob yozuv qoʻsha olmaydi; /stop uzadi', async () => {
  await link();
  db.prepare("UPDATE users SET status='suspended' WHERE id=?").run(user.id);
  await bot.handleUpdate(msg({ text: 'taksi 30 ming' }));
  assert.match(sent.at(-1).text, /toʻxtatilgan/);
  assert.equal(txs.count(user.id), 0);
  await bot.handleUpdate(msg({ text: '/stop' }));
  assert.equal(tg.getByUser(user.id), null);
});

test('guruh chatida ishlamaydi; juda uzun ovoz rad etiladi', async () => {
  await link();
  const before = sent.length;
  await bot.handleUpdate({ update_id: 5, message: { chat: { id: 100, type: 'group' }, text: 'taksi 30 ming' } });
  assert.equal(sent.length, before);
  await bot.handleUpdate(msg({ voice: { file_id: 'f', duration: 300 } }));
  assert.match(sent.at(-1).text, /uzun/);
});
