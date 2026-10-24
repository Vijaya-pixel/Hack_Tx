// Storage interface for Four Corners, plus an in-memory implementation.
// The real one is TigerData (Postgres): see pgstore.ts. Memory is for tests and quick local runs.
import { randomBytes } from 'node:crypto';
import type { ChainRecord, FeedItem, Group, Member } from './types.ts';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
export const newCode = (): string =>
  Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
export const newId = (): string => randomBytes(8).toString('hex');

// One row of the trip-health time series: how likely the group's best plan is to happen, at a moment.
export interface ScoreEvent {
  time: string; // ISO timestamp
  city?: string | null;
  weekend?: string | null;
  nights?: number | null;
  survival: number;
  reason: string;
  seeded?: boolean; // true for synthetic demo history
}
export interface TrendPoint { bucket: string; avg: number; best: number; samples: number; seeded: boolean }
export type Bucket = 'hour' | 'day';

export interface Store {
  readonly kind: string;
  init(): Promise<void>;
  close(): Promise<void>;
  createGroup(name: string): Promise<Group>;
  deleteGroup(code: string): Promise<void>;
  getGroup(code: unknown): Promise<Group | null>;
  addMember(code: string, member: Member): Promise<void>;
  setAvailability(code: string, memberId: string, weekends: string[], maxTravelHours?: number): Promise<void>;
  setPact(code: string, record: ChainRecord): Promise<void>;
  tamperPact(code: string, city: string): Promise<void>;
  addStamp(code: string, record: ChainRecord): Promise<void>;
  addFeed(code: string, item: FeedItem): Promise<void>;
  logScore(code: string, event: ScoreEvent): Promise<void>;
  scoreTrend(code: string, bucket?: Bucket): Promise<TrendPoint[]>;
  newId(): string;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

// Same bucketing as the SQL version: floor the timestamp to the hour or the day (UTC).
export function bucketOf(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  if (bucket === 'day') d.setUTCHours(0, 0, 0, 0);
  else d.setUTCMinutes(0, 0, 0);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function trendFromEvents(events: ScoreEvent[], bucket: Bucket): TrendPoint[] {
  const groups = new Map<string, ScoreEvent[]>();
  for (const e of events) {
    const k = bucketOf(e.time, bucket);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, list]) => ({
    bucket: k,
    avg: round2(list.reduce((s, e) => s + e.survival, 0) / list.length),
    best: round2(Math.max(...list.map((e) => e.survival))),
    samples: list.length,
    seeded: list.some((e) => e.seeded),
  }));
}

export function createMemoryStore(): Store {
  const groups = new Map<string, Group>();
  const events = new Map<string, ScoreEvent[]>();
  const need = (code: string): Group => {
    const g = groups.get(code);
    if (!g) throw new Error(`no such group ${code}`);
    return g;
  };
  // Hand out copies, like a database would, so callers can't change stored data by accident.
  const copy = (g: Group): Group => structuredClone(g);
  return {
    kind: 'memory',
    async init() { /* nothing to set up */ },
    async close() { groups.clear(); events.clear(); },
    async createGroup(name) {
      let code = newCode();
      while (groups.has(code)) code = newCode();
      const g: Group = {
        code, name, createdAt: new Date().toISOString(), members: [], availability: {},
        pact: null, stamps: [], feed: [],
      };
      groups.set(code, g);
      return copy(g);
    },
    async deleteGroup(code) { groups.delete(code); events.delete(code); },
    async getGroup(code) {
      const g = groups.get(String(code ?? '').toUpperCase());
      return g ? copy({ ...g, feed: g.feed.slice(-50) }) : null;
    },
    async addMember(code, member) { need(code).members.push(structuredClone(member)); },
    async setAvailability(code, memberId, weekends, maxTravelHours) {
      const g = need(code);
      g.availability[memberId] = [...new Set(weekends)].sort();
      const m = g.members.find((x) => x.id === memberId);
      if (m && maxTravelHours !== undefined) m.maxTravelHours = maxTravelHours;
    },
    async setPact(code, record) { need(code).pact = structuredClone(record); },
    async tamperPact(code, city) {
      const g = need(code);
      if (g.pact) g.pact.payload.city = city;
    },
    async addStamp(code, record) { need(code).stamps.push(structuredClone(record)); },
    async addFeed(code, item) { need(code).feed.push({ ...item }); },
    async logScore(code, event) { events.set(code, [...(events.get(code) ?? []), { ...event }]); },
    async scoreTrend(code, bucket = 'day') { return trendFromEvents(events.get(code) ?? [], bucket); },
    newId,
  };
}
