// Minimal Gemini client over REST (no SDK). The key goes in a header, never in the URL, and the model comes from the environment.
// Docs: https://ai.google.dev/api  (POST /v1beta/models/{model}:generateContent, header x-goog-api-key)
import type { Llm } from './explain.ts';

type Env = Record<string, string | undefined>;
// The best model a free-tier key could use when this was set up (Pro models need a paid plan, and the 2.5 models are closed to new keys).
// Set GEMINI_MODEL in .env to change it. If the first model is busy or fails, the backups below are tried in order.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const BACKUP_GEMINI_MODELS = ['gemini-3-flash-preview'];

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch; // injectable so tests never touch the network
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export function createGeminiLlm({ apiKey, model = DEFAULT_GEMINI_MODEL, timeoutMs = 20_000, fetchFn = fetch }: GeminiOptions): Llm {
  if (!apiKey) throw new Error('GEMINI_API_KEY is empty');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    source: 'gemini',
    model,
    async complete(prompt: string, opts?: { json?: boolean }): Promise<string> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          // maxOutputTokens leaves room for the model's own thinking plus a short answer.
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048, ...(opts?.json ? { responseMimeType: 'application/json' } : {}) } }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => ({}))) as GeminiResponse;
        if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${body.error?.message ?? 'no details'}`);
        if (body.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request: ${body.promptFeedback.blockReason}`);
        const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
        if (!text) throw new Error('Gemini returned no text');
        return text;
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw new Error('Gemini timed out');
        throw e;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// Tries each model in order and returns the first answer. A busy or failing model just moves on to the next one.
export function createGeminiChain(opts: Omit<GeminiOptions, 'model'> & { models: string[] }): Llm {
  const llms = opts.models.map((model) => createGeminiLlm({ ...opts, model }));
  return {
    source: 'gemini',
    model: opts.models[0],
    async complete(prompt, o) {
      let last: Error = new Error('No Gemini model configured');
      for (const llm of llms) {
        try { return await llm.complete(prompt, o); } catch (e) { last = e as Error; }
      }
      throw last;
    },
  };
}

// Returns null when no key is set. GEMINI_MODEL (if set) goes first, then the built-in backups.
export function geminiFromEnv(env: Env = process.env): Llm | null {
  if (!env.GEMINI_API_KEY) return null;
  const models = [...new Set([env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL, ...BACKUP_GEMINI_MODELS])];
  return createGeminiChain({ apiKey: env.GEMINI_API_KEY, models });
}
