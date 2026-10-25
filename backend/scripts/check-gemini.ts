// Checks that GEMINI_API_KEY (and GEMINI_MODEL) in backend/.env work. Run: npm run gemini:check
// Prints what happened without ever printing the key.
import { createGeminiLlm, DEFAULT_GEMINI_MODEL } from '../src/toyota/gemini.ts';

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
if (!key) {
  console.error('GEMINI_API_KEY is not set. Add it to backend/.env (see .env.example).');
  process.exit(1);
}
console.log(`Asking ${model} for a one-line reply (key ends in ...${key.slice(-4)})`);
try {
  const text = await createGeminiLlm({ apiKey: key, model }).complete('Reply with exactly: ready');
  console.log(`Gemini says: ${text}`);
  console.log('OK: the key and model work.');
} catch (err) {
  console.error(`Failed: ${(err as Error).message}`);
  console.error('If it says the model was not found, set GEMINI_MODEL in .env to a model listed at https://ai.google.dev/gemini-api/docs/models');
  process.exit(1);
}
