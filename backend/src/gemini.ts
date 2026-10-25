// Minimal Gemini client over REST (no SDK). The key goes in a header, never in the URL, and the model comes from the environment.
// Docs: https://ai.google.dev/api  (POST /v1beta/models/{model}:generateContent, header x-goog-api-key)
import type { Llm } from './explain.ts';

type Env = Record<string, string | undefined>;
// The strongest Gemini model we know of. Set GEMINI_MODEL in .env to change it (for example gemini-2.5-flash for faster, cheaper answers).
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';

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

export function createGeminiLlm({ apiKey, model = DEFAULT_GEMINI_MODEL, timeoutMs = 25_000, fetchFn = fetch }: GeminiOptions): Llm {
  if (!apiKey) throw new Error('GEMINI_API_KEY is empty');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    source: 'gemini',
    model,
    async complete(prompt: string): Promise<string> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } // room for the model's own thinking plus a short answer }),
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

// Returns null when no key is set.
export const geminiFromEnv = (env: Env = process.env): Llm | null =>
  env.GEMINI_API_KEY ? createGeminiLlm({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL }) : null;
