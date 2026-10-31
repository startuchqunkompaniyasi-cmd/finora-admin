/**
 * providers/speech/openaiProvider.js
 * Ovozni matnga aylantirish: OpenAI /v1/audio/transcriptions (Whisper). Boshqa provayder
 * (masalan oʻzbekcha maxsus STT) qoʻshish uchun shu imzoli obyekt yozish yetarli:
 *   { transcribe(buffer, { filename, mimeType }) => Promise<string> }
 */

const PROMPT = "Xarajat va daromad: taksiga 30 ming soʻm, tushlik 45 ming soʻm, maosh 5 million soʻm, kecha dorixonada 120 ming soʻm.";

export function createOpenAiSpeechProvider({ apiKey, model = 'whisper-1', language = 'uz', fetchImpl = fetch }) {
  return {
    name: 'openai',
    async transcribe(buffer, { filename = 'voice.ogg', mimeType = 'audio/ogg' } = {}) {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType }), filename);
      form.append('model', model);
      if (language) form.append('language', language);
      form.append('prompt', PROMPT);
      form.append('response_format', 'json');

      const response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`STT HTTP ${response.status}`);
      const body = await response.json();
      return String(body.text ?? '').trim();
    },
  };
}
