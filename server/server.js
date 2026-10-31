/**
 * server/server.js - entry point: `npm start`
 */

import { env } from './config/env.js';
import { createApp } from './app.js';
import { initAdmin } from './controllers/adminController.js';
import { getDb } from './database/db.js';
import { createTelegramApi } from './services/telegramApi.js';
import { createTelegramBot } from './services/telegramBot.js';
import { createTelegramRepository } from './repositories/telegramRepository.js';
import { createTransactionsRepository } from './repositories/transactionsRepository.js';
import { createOpenAiSpeechProvider } from './providers/speech/openaiProvider.js';
import { getRate } from './services/exchangeService.js';
import { telegramRuntime } from './services/telegramRuntime.js';

await initAdmin(); // birinchi ishga tushirishda bitta admin yaratadi (env dan), keyingi safar hech narsa qilmaydi

const server = createApp().listen(env.port, () => {
  console.log(`Finora running at http://localhost:${env.port} (${env.nodeEnv})`);
});

let bot = null;
if (env.telegram.botToken) {
  try {
    const api = createTelegramApi({ token: env.telegram.botToken });
    const db = getDb();
    bot = createTelegramBot({
      api,
      speech: env.speech.openaiApiKey ? createOpenAiSpeechProvider({ apiKey: env.speech.openaiApiKey, model: env.speech.model, language: env.speech.language }) : null,
      telegramRepository: createTelegramRepository(db),
      transactionsRepository: createTransactionsRepository(db),
      getRate,
    });
    const me = await bot.start();
    telegramRuntime.enabled = true;
    telegramRuntime.username = env.telegram.botUsername ?? me?.username ?? null;
    console.log(`[finora] Telegram bot ishga tushdi: @${telegramRuntime.username}${env.speech.openaiApiKey ? '' : ' (ovoz tanish OFF: OPENAI_API_KEY yoʻq)'}`);
  } catch (error) {
    console.error('[finora] Telegram botni ishga tushirib boʻlmadi (sayt ishlashda davom etadi):', error.message);
  }
}

function shutdown(signal) {
  bot?.stop();
  console.log(`${signal} received, shutting down.`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
