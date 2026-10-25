// Minimal Gemini client over REST (no SDK). Header auth, model name from the environment.
// Docs: https://ai.google.dev/api  (POST /v1beta/models/{model}:generateContent, header x-goog-api-key)
import type { Llm } from '../types.ts';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;   // injectable so tests never touch the network
  system?: string;          // system instruction
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export function createGeminiLlm({ apiKey, model = DEFAULT_GEMINI_MODEL, timeoutMs = 12000, fetchFn = fetch, system }: GeminiOptions): Llm {
  if (!apiKey) throw new Error('GEMINI_API_KEY is empty');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    async complete(prompt: string): Promise<string> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
          }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => ({}))) as GeminiResponse;
        if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${body.error?.message ?? 'no details'}`);
        if (body.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request: ${body.promptFeedback.blockReason}`);
        const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
        if (!text) throw new Error('Gemini returned no text');
        return text;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
