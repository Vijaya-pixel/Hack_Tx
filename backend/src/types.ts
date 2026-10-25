// Shared types for the backend. Add the app's own types here as the product takes shape.

export interface MemoCheck { found: boolean; memoMatches: boolean; allSigned: boolean }
export interface SentMemo { signature: string; signers: string[]; custody: string }

// The server only talks to this interface (real Solana, fake for tests, mock for UI work).
export interface Chain {
  kind: string;
  signerKeys(count: number): Promise<string[]>;
  sendMemo(args: { memo: string; count: number }): Promise<SentMemo>;
  checkMemo(args: { signature: string; expectedMemo: string; requiredSigners: string[] }): Promise<MemoCheck>;
  explorer(signature: string): string;
}

// Optional text model: given a prompt, return text. Anything can sit behind it.
export interface Llm { complete(prompt: string): Promise<string> }
