/**
 * services/telegramApi.js
 * Telegram Bot API uchun kichik mijoz (tashqi paketsiz). `fetchImpl` testlar uchun almashtiriladi.
 */

export function createTelegramApi({ token, fetchImpl = fetch }) {
  const base = `https://api.telegram.org/bot${token}`;

  async function call(method, payload = {}, { timeoutMs = 15_000 } = {}) {
    const response = await fetchImpl(`${base}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      const error = new Error(`Telegram ${method}: ${body?.description ?? `HTTP ${response.status}`}`);
      error.status = response.status;
      throw error;
    }
    return body.result;
  }

  return {
    call,
    getMe: () => call('getMe'),
    getUpdates: (offset, timeout = 25) => call('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] }, { timeoutMs: (timeout + 10) * 1000 }),
    sendMessage: (chatId, text, extra = {}) => call('sendMessage', { chat_id: chatId, text, ...extra }),
    answerCallbackQuery: (id, text) => call('answerCallbackQuery', { callback_query_id: id, text }),
    editMessageReplyMarkup: (chatId, messageId) => call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
    async downloadFile(fileId) {
      const file = await call('getFile', { file_id: fileId });
      const response = await fetchImpl(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Telegram fayl yuklanmadi: HTTP ${response.status}`);
      return { buffer: Buffer.from(await response.arrayBuffer()), path: file.file_path };
    },
  };
}
