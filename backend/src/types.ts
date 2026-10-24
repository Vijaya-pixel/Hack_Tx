// Shared types for the Four Corners backend.

export interface Character {
  color: string; hair: string; accessory: string; mood: string; pose: string;
  title: string; tagline: string; source: 'ai' | 'fallback';
}

export interface Member {
  id: string;
  token: string; // secret, never sent to other members
  name: string;
  describe: string;
  city: string;
  lat: number;
  lon: number;
  vibe: string;
  character: Character;
  maxTravelHours: number;
  isDemo?: boolean;
}

export type PublicMember = Omit<Member, 'token' | 'lat' | 'lon'>;

export interface City { name: string; lat: number; lon: number }

export interface PlanRow {
  weekend: string; city: string; nights: number;
  maxTravelHours: number; estCostPp: number; costGap: number; leadDays: number;
  feasible: boolean; survival: number;
}

export interface PlanInput {
  code?: string;
  members: Member[];
  availability: Record<string, string[]>;
  today: string;
  nights?: number;
  cities?: City[];
}
export type PlanEngine = (input: PlanInput) => Promise<PlanRow[]> | PlanRow[];

export interface Payload {
  type: 'pact' | 'stamp';
  group: string; city: string; weekend: string;
  nights?: number; pactHash?: string; streak?: number;
  members: string[];
}

export interface ChainRecord {
  signature: string; hash: string; payload: Payload;
  custody: string; chain: string; url: string; at: string; survival?: number;
}

export interface FeedItem { at: string; system?: boolean; from?: string; name?: string; text: string }

export interface Group {
  code: string; name: string; createdAt: string;
  members: Member[];
  availability: Record<string, string[]>;
  pact: ChainRecord | null;
  stamps: ChainRecord[];
  feed: FeedItem[];
}

export interface Nudge { kind: 'availability' | 'countdown' | 'prompt'; to?: string; text: string }

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

export interface Llm { complete(prompt: string): Promise<string> }

export interface SuggestedPlan {
  weekend: string; city: string; nights: number; maxTravelHours: number;
  estCostPp: number; survival: number; delta: number; label: string;
}
