// Four Corners API. Run: npm start   (env: see README)
import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CITIES, findCity } from './cities.ts';
import { planOptions, suggestSmaller, addDays } from './engine.ts';
import { makeCharacter, VIBES } from './character.ts';
import { createStore, type Store } from './store.ts';
import { fingerprint, type Json } from './fingerprint.ts';
import { buildNudges } from './nudges.ts';
import { createFakeChain, createMockChain, createSolanaChain } from './chain.ts';
import type {
  Chain, ChainRecord, Group, Llm, Member, Payload, PlanEngine, PlanInput, PlanRow, PublicMember,
} from './types.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = (): string => new Date().toISOString().slice(0, 10);

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const bad = (msg: string): HttpError => new HttpError(400, msg);

// The next 20 Saturdays after `today`: the weekends people can mark as free.
export function upcomingWeekends(today: string, count = 20): string[] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sunday .. 6 Saturday
  const first = addDays(today, (6 - dow + 7) % 7 || 7);
  return Array.from({ length: count }, (_, n) => addDays(first, 7 * n));
}

const hash32 = (s: string): number => {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

interface MemberInput { name?: unknown; describe?: unknown; city?: unknown; vibe?: unknown }

// Seeded demo friends: the cast of four. Weekends 3, 7 and 11 are free for everyone.
export const DEMO_CAST = [
  { name: 'Arlo', city: 'Seattle', vibe: 'outdoors', describe: 'Steady and reliable, always the one with a map and a thermos of coffee.' },
  { name: 'Beck', city: 'Austin', vibe: 'adventure', describe: 'Up for anything. Will hike, climb or road trip on a moment\'s notice.' },
  { name: 'Cyrus', city: 'Chicago', vibe: 'food', describe: 'Lives for good food. Has opinions about every restaurant in town.' },
  { name: 'Dante', city: 'Atlanta', vibe: 'chill', describe: 'Quiet, thoughtful, loves music and a good playlist.' },
];
export function demoAvailability(name: string, weekends: string[]): string[] {
  return weekends.filter((_, n) => [3, 7, 11].includes(n) || hash32(`${name}:${n}`) % 100 < 60);
}

export interface AppOptions {
  store?: Store; chain?: Chain; planEngine?: PlanEngine | null; llm?: Llm | null;
  today?: () => string; allowDemo?: boolean; allowTamper?: boolean; engineName?: string;
}

export function createApp({
  store = createStore(), chain = createFakeChain(), planEngine = null, llm = null,
  today = todayIso, allowDemo = true, allowTamper = false, engineName = 'local',
}: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  const now = (req: Request): string => {
    const t = req.query.today;
    if (typeof t === 'string' && allowDemo) {
      if (!ISO_DATE.test(t)) throw bad('today must be YYYY-MM-DD');
      return t;
    }
    return today();
  };

  const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
    (req, res) => {
      // Start inside a promise so synchronous throws are caught the same way as async ones.
      Promise.resolve().then(() => fn(req, res)).catch((err: unknown) => {
        const status = err instanceof HttpError ? err.status : 500;
        if (status === 500) console.error(err);
        res.status(status).json({ error: err instanceof HttpError ? err.message : 'Something went wrong on our side.' });
      });
    };

  const code = (req: Request): string => String(req.params.code);
  const group = (req: Request): Group => {
    const g = store.getGroup(code(req));
    if (!g) throw new HttpError(404, 'Group not found. Check the invite code.');
    return g;
  };
  const me = (g: Group, req: Request): Member => {
    const token = req.get('x-member-token');
    const m = g.members.find((x) => x.token && x.token === token);
    if (!m) throw new HttpError(401, 'Missing or wrong member token.');
    return m;
  };
  const publicMember = ({ token: _token, lat: _lat, lon: _lon, ...rest }: Member): PublicMember => rest;
  const view = (g: Group, t: string) => ({
    code: g.code, name: g.name, members: g.members.map(publicMember),
    submitted: g.members.filter((m) => (g.availability[m.id] || []).length).map((m) => m.id),
    stage: g.stamps.length ? 'stamped' : g.pact ? 'pacted' : 'gathering',
    pact: g.pact, stamps: g.stamps, streak: g.stamps.length, feed: g.feed.slice(-50),
    weekends: upcomingWeekends(t),
  });
  const event = (g: Group, text: string): void => {
    g.feed.push({ at: new Date().toISOString(), system: true, text });
  };

  async function addMember(g: Group, input: MemberInput, extra: Partial<Member> = {}): Promise<Member> {
    const name = String(input.name ?? '').trim();
    if (!name || name.length > 40) throw bad('Name is required (max 40 characters).');
    const describe = String(input.describe ?? '').trim().slice(0, 300);
    if (!describe) throw bad('Tell us a little about yourself.');
    const city = findCity(input.city);
    if (!city) throw bad(`We don't know that city yet. Try one of: ${CITIES.slice(0, 8).map((c) => c.name).join(', ')}...`);
    const vibe = typeof input.vibe === 'string' && VIBES.includes(input.vibe) ? input.vibe : null;
    if (!vibe) throw bad(`vibe must be one of: ${VIBES.join(', ')}`);
    if (g.members.length >= 6) throw bad('This group is full (max 6).');
    if (g.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw bad('That name is already taken in this group.');
    const character = await makeCharacter({ name, describe, city: city.name, vibe }, llm);
    const member: Member = {
      id: store.newId(), token: store.newId(), name, describe, city: city.name,
      lat: city.lat, lon: city.lon, vibe, character, maxTravelHours: 8, ...extra,
    };
    g.members.push(member);
    event(g, `${name} (${character.title}) joined Base Camp from ${city.name}.`);
    store.save();
    return member;
  }

  const rowsFor = async (g: Group, t: string, nights: number): Promise<PlanRow[]> => {
    const input: PlanInput = { code: g.code, members: g.members, availability: g.availability, today: t, nights };
    return planEngine ? planEngine(input) : planOptions(input);
  };

  app.get('/api/health', (_req, res) => { res.json({ ok: true, engine: engineName, chain: chain.kind }); });
  app.get('/api/cities', (_req, res) => { res.json(CITIES.map((c) => c.name)); });

  app.post('/api/groups', wrap(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name || name.length > 60) throw bad('Group name is required (max 60 characters).');
    const g = store.createGroup(name);
    let member: Member;
    try { member = await addMember(g, req.body?.creator ?? {}); }
    catch (err) { store.deleteGroup(g.code); throw err; }
    res.status(201).json({ group: view(g, now(req)), you: { id: member.id, token: member.token, character: member.character } });
  }));

  app.post('/api/groups/:code/join', wrap(async (req, res) => {
    const g = group(req);
    const member = await addMember(g, req.body ?? {});
    res.status(201).json({ group: view(g, now(req)), you: { id: member.id, token: member.token, character: member.character } });
  }));

  app.get('/api/groups/:code', wrap((req, res) => { res.json(view(group(req), now(req))); }));

  // Fill the group with the seeded cast so one person can demo alone.
  app.post('/api/groups/:code/demo-friends', wrap(async (req, res) => {
    if (!allowDemo) throw new HttpError(403, 'Demo mode is off.');
    const g = group(req);
    const t = now(req);
    const weekends = upcomingWeekends(t);
    const have = new Set(g.members.map((m) => m.name.toLowerCase()));
    for (const f of DEMO_CAST) {
      if (g.members.length >= 4) break;
      if (have.has(f.name.toLowerCase())) continue;
      const m = await addMember(g, f, { isDemo: true });
      g.availability[m.id] = demoAvailability(m.name, weekends);
    }
    if (req.body?.fillMine) {
      const mine = me(g, req);
      g.availability[mine.id] = demoAvailability(mine.name, weekends);
    }
    store.save();
    res.json(view(g, t));
  }));

  app.post('/api/groups/:code/availability', wrap((req, res) => {
    const g = group(req);
    const m = me(g, req);
    const allowed = new Set(upcomingWeekends(now(req)));
    const weekends: unknown = req.body?.weekends;
    if (!Array.isArray(weekends) || weekends.some((d) => !allowed.has(d))) {
      throw bad('weekends must be a list of upcoming Saturdays from /api/groups/:code.');
    }
    const limit = Number(req.body?.maxTravelHours ?? m.maxTravelHours);
    if (!(limit >= 1 && limit <= 14)) throw bad('maxTravelHours must be between 1 and 14.');
    g.availability[m.id] = [...new Set(weekends as string[])].sort();
    m.maxTravelHours = limit;
    store.save();
    res.json(view(g, now(req)));
  }));

  // Scout the Route: best shared weekends and cities.
  app.get('/api/groups/:code/scout', wrap(async (req, res) => {
    const g = group(req);
    const t = now(req);
    const nights = Number(req.query.nights ?? 2);
    if (!(nights >= 1 && nights <= 5)) throw bad('nights must be 1 to 5.');
    const pending = g.members.filter((m) => !(g.availability[m.id] || []).length).map((m) => m.name);
    if (g.members.length < 2) { res.json({ ready: false, pending, plans: [], reason: 'Invite at least one friend.' }); return; }
    if (pending.length) { res.json({ ready: false, pending, plans: [], reason: 'Waiting on free weekends.' }); return; }
    const rows = await rowsFor(g, t, nights);
    res.json({ ready: true, pending: [], plans: rows.slice(0, 8), totalOptions: rows.length, engine: engineName, nights });
  }));

  // Summit Odds: survival score for one plan, plus smaller versions that score higher.
  app.get('/api/groups/:code/odds', wrap(async (req, res) => {
    const g = group(req);
    const t = now(req);
    const weekend = String(req.query.weekend ?? '');
    const nights = Number(req.query.nights ?? 2);
    const city = findCity(req.query.city);
    if (!city) throw bad('Unknown city.');
    if (!ISO_DATE.test(weekend)) throw bad('weekend must be YYYY-MM-DD.');
    const rows = await rowsFor(g, t, nights);
    const result = suggestSmaller({ rows, weekend, city: city.name, nights, groupSize: g.members.length });
    if (!result) throw new HttpError(404, 'That weekend and city is not a plan the whole group can do.');
    res.json(result);
  }));

  // Plant the Flag: all signers co-sign the pact.
  app.post('/api/groups/:code/pact', wrap(async (req, res) => {
    const g = group(req);
    me(g, req);
    if (g.pact) throw new HttpError(409, 'This group already planted its flag.');
    const t = now(req);
    const city = findCity(req.body?.city);
    const nights = Number(req.body?.nights ?? 2);
    if (!city) throw bad('Unknown city.');
    const rows = await rowsFor(g, t, nights);
    const plan = rows.find((r) => r.weekend === req.body?.weekend && r.city === city.name);
    if (!plan) throw bad('Everyone has to be free that weekend.');
    if (!plan.feasible) throw bad('That plan is too far for at least one friend.');
    const members = (await chain.signerKeys(g.members.length)).slice().sort();
    const payload: Payload = { type: 'pact', group: g.code, city: plan.city, weekend: plan.weekend, nights, members };
    const hash = fingerprint(payload as unknown as Json);
    const sent = await chain.sendMemo({ memo: `FC1|pact|${hash}`, count: g.members.length });
    g.pact = {
      signature: sent.signature, hash, payload, custody: sent.custody, chain: chain.kind,
      url: chain.explorer(sent.signature), at: new Date().toISOString(), survival: plan.survival,
    };
    event(g, `The flag is planted! ${g.members.length} signatures for ${plan.city}, weekend of ${plan.weekend}.`);
    store.save();
    res.status(201).json(g.pact);
  }));

  async function verify(record: ChainRecord, type: 'pact' | 'stamp') {
    const recomputed = fingerprint(record.payload as unknown as Json);
    const check = await chain.checkMemo({
      signature: record.signature, expectedMemo: `FC1|${type}|${recomputed}`, requiredSigners: record.payload.members,
    });
    const verified = check.found && check.memoMatches && check.allSigned;
    return { verified, ...check, url: record.url, chain: record.chain, custody: record.custody };
  }

  app.get('/api/groups/:code/pact/verify', wrap(async (req, res) => {
    const g = group(req);
    if (!g.pact) throw new HttpError(404, 'No pact yet.');
    res.json(await verify(g.pact, 'pact'));
  }));

  // Summit Stamp: after the trip, everyone confirms. Streak goes up.
  app.post('/api/groups/:code/stamp', wrap(async (req, res) => {
    const g = group(req);
    me(g, req);
    if (!g.pact) throw new HttpError(409, 'Plant the flag first.');
    if (g.stamps.length) throw new HttpError(409, 'This trip is already stamped.');
    const streak = g.stamps.length + 1;
    const payload: Payload = {
      type: 'stamp', group: g.code, city: g.pact.payload.city, weekend: g.pact.payload.weekend,
      pactHash: g.pact.hash, streak, members: g.pact.payload.members,
    };
    const hash = fingerprint(payload as unknown as Json);
    const sent = await chain.sendMemo({ memo: `FC1|stamp|${hash}`, count: g.members.length });
    const record: ChainRecord = {
      signature: sent.signature, hash, payload, custody: sent.custody, chain: chain.kind,
      url: chain.explorer(sent.signature), at: new Date().toISOString(),
    };
    g.stamps.push(record);
    event(g, `Summit Stamp #${streak}! The group made it to ${payload.city}.`);
    store.save();
    res.status(201).json(record);
  }));

  app.get('/api/groups/:code/nudges', wrap((req, res) => { res.json(buildNudges(group(req), now(req))); }));

  app.get('/api/groups/:code/feed', wrap((req, res) => { res.json(group(req).feed.slice(-50)); }));
  app.post('/api/groups/:code/feed', wrap((req, res) => {
    const g = group(req);
    const m = me(g, req);
    const text = String(req.body?.text ?? '').trim();
    if (!text || text.length > 280) throw bad('Message must be 1 to 280 characters.');
    g.feed.push({ at: new Date().toISOString(), from: m.id, name: m.name, text });
    store.save();
    res.status(201).json(g.feed.slice(-50));
  }));

  // Demo-only: change a stored pact value to show that verification catches it.
  app.post('/api/groups/:code/debug/tamper', wrap((req, res) => {
    if (!allowTamper) throw new HttpError(403, 'Tamper demo is off. Set ALLOW_TAMPER_DEMO=1.');
    const g = group(req);
    if (!g.pact) throw new HttpError(404, 'No pact yet.');
    g.pact.payload.city = String(req.body?.city || 'Atlantis');
    store.save();
    res.json({ tampered: true });
  }));

  app.use((_req, res) => { res.status(404).json({ error: 'Not found.' }); });
  return app;
}

async function main(): Promise<void> {
  const env = process.env;
  let planEngine: PlanEngine | null = null;
  let llm: Llm | null = null;
  let engineName = 'local';
  if (env.ENGINE === 'snowflake') {
    const { createSnowflakeEngine } = await import('./snowflake.ts');
    const sf = await createSnowflakeEngine(env);
    planEngine = (input) => sf.planOptions(input);
    if (env.LLM === 'snowflake') llm = { complete: (p) => sf.complete(p) };
    engineName = 'snowflake';
  }
  const chain = env.CHAIN === 'mock' ? createMockChain() : createSolanaChain();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const store = createStore({ file: env.DATA_FILE || path.join(here, '..', 'data', 'state.json') });
  const app = createApp({
    store, chain, planEngine, llm, engineName,
    allowDemo: env.DEMO_MODE !== '0', allowTamper: env.ALLOW_TAMPER_DEMO === '1',
  });
  const port = Number(env.PORT || 8787);
  app.listen(port, () => console.log(`Four Corners API on :${port} | engine=${engineName} chain=${chain.kind}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
