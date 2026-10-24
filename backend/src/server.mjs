// Four Corners API. Run: npm start   (env: see README)
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CITIES, findCity } from './cities.mjs';
import { planOptions, suggestSmaller, addDays, daysBetween } from './engine.mjs';
import { makeCharacter, VIBES } from './character.mjs';
import { createStore } from './store.mjs';
import { fingerprint } from './fingerprint.mjs';
import { buildNudges } from './nudges.mjs';
import { createFakeChain, createMockChain, createSolanaChain } from './chain.mjs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);

// The next 20 Saturdays after `today`: the weekends people can mark as free.
export function upcomingWeekends(today, count = 20) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sunday .. 6 Saturday
  const first = addDays(today, (6 - dow + 7) % 7 || 7);
  return Array.from({ length: count }, (_, n) => addDays(first, 7 * n));
}

const hash32 = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// Seeded demo friends: the cast of four. Weekends 3, 7 and 11 are free for everyone.
export const DEMO_CAST = [
  { name: 'Arlo', city: 'Seattle', vibe: 'outdoors', describe: 'Steady and reliable, always the one with a map and a thermos of coffee.' },
  { name: 'Beck', city: 'Austin', vibe: 'adventure', describe: 'Up for anything. Will hike, climb or road trip on a moment\'s notice.' },
  { name: 'Cyrus', city: 'Chicago', vibe: 'food', describe: 'Lives for good food. Has opinions about every restaurant in town.' },
  { name: 'Dante', city: 'Atlanta', vibe: 'chill', describe: 'Quiet, thoughtful, loves music and a good playlist.' },
];
export function demoAvailability(name, weekends) {
  return weekends.filter((_, n) => [3, 7, 11].includes(n) || hash32(`${name}:${n}`) % 100 < 60);
}

export function createApp({
  store = createStore(), chain = createFakeChain(), planEngine = null, llm = null,
  today = todayIso, allowDemo = true, allowTamper = false, engineName = 'local',
} = {}) {
  const app = express();
  app.use(express.json({ limit: '50kb' }));
  const now = (req) => {
    const t = req?.query?.today;
    if (t && allowDemo) { if (!ISO_DATE.test(t)) throw bad('today must be YYYY-MM-DD'); return t; }
    return today();
  };

  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Something went wrong on our side.' : err.message });
  });

  const group = (req) => {
    const g = store.getGroup(req.params.code);
    if (!g) throw new HttpError(404, 'Group not found. Check the invite code.');
    return g;
  };
  const me = (g, req) => {
    const token = req.get('x-member-token');
    const m = g.members.find((x) => x.token && x.token === token);
    if (!m) throw new HttpError(401, 'Missing or wrong member token.');
    return m;
  };
  const publicMember = ({ token, lat, lon, ...rest }) => rest;
  const view = (g, t) => ({
    code: g.code, name: g.name, members: g.members.map(publicMember),
    submitted: g.members.filter((m) => (g.availability[m.id] || []).length).map((m) => m.id),
    stage: g.stamps.length ? 'stamped' : g.pact ? 'pacted' : 'gathering',
    pact: g.pact, stamps: g.stamps, streak: g.stamps.length, feed: g.feed.slice(-50),
    weekends: upcomingWeekends(t),
  });
  const event = (g, text) => { g.feed.push({ at: new Date().toISOString(), system: true, text }); };

  async function addMember(g, input, extra = {}) {
    const name = String(input.name || '').trim();
    if (!name || name.length > 40) throw bad('Name is required (max 40 characters).');
    const describe = String(input.describe || '').trim().slice(0, 300);
    if (!describe) throw bad('Tell us a little about yourself.');
    const city = findCity(input.city);
    if (!city) throw bad(`We don't know that city yet. Try one of: ${CITIES.slice(0, 8).map((c) => c.name).join(', ')}...`);
    const vibe = VIBES.includes(input.vibe) ? input.vibe : null;
    if (!vibe) throw bad(`vibe must be one of: ${VIBES.join(', ')}`);
    if (g.members.length >= 6) throw bad('This group is full (max 6).');
    if (g.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw bad('That name is already taken in this group.');
    const character = await makeCharacter({ name, describe, city: city.name, vibe }, llm);
    const member = {
      id: store.newId(), token: store.newId(), name, describe, city: city.name,
      lat: city.lat, lon: city.lon, vibe, character, maxTravelHours: 8, ...extra,
    };
    g.members.push(member);
    event(g, `${name} (${character.title}) joined Base Camp from ${city.name}.`);
    store.save();
    return member;
  }

  const rowsFor = async (g, t, nights) => {
    const input = { code: g.code, members: g.members, availability: g.availability, today: t, nights };
    return planEngine ? planEngine(input) : planOptions(input);
  };

  app.get('/api/health', (req, res) => res.json({ ok: true, engine: engineName, chain: chain.kind }));
  app.get('/api/cities', (req, res) => res.json(CITIES.map((c) => c.name)));

  app.post('/api/groups', wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 60) throw bad('Group name is required (max 60 characters).');
    const g = store.createGroup(name);
    let member;
    try { member = await addMember(g, req.body.creator || {}); }
    catch (err) { store.deleteGroup(g.code); throw err; }
    res.status(201).json({ group: view(g, now(req)), you: { id: member.id, token: member.token, character: member.character } });
  }));

  app.post('/api/groups/:code/join', wrap(async (req, res) => {
    const g = group(req);
    const member = await addMember(g, req.body);
    res.status(201).json({ group: view(g, now(req)), you: { id: member.id, token: member.token, character: member.character } });
  }));

  app.get('/api/groups/:code', wrap(async (req, res) => res.json(view(group(req), now(req)))));

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

  app.post('/api/groups/:code/availability', wrap(async (req, res) => {
    const g = group(req);
    const m = me(g, req);
    const allowed = new Set(upcomingWeekends(now(req)));
    const weekends = Array.isArray(req.body.weekends) ? req.body.weekends : null;
    if (!weekends || weekends.some((d) => !allowed.has(d))) throw bad('weekends must be a list of upcoming Saturdays from /api/groups/:code.');
    const limit = Number(req.body.maxTravelHours ?? m.maxTravelHours);
    if (!(limit >= 1 && limit <= 14)) throw bad('maxTravelHours must be between 1 and 14.');
    g.availability[m.id] = [...new Set(weekends)].sort();
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
    if (g.members.length < 2) return res.json({ ready: false, pending, plans: [], reason: 'Invite at least one friend.' });
    if (pending.length) return res.json({ ready: false, pending, plans: [], reason: 'Waiting on free weekends.' });
    const rows = await rowsFor(g, t, nights);
    res.json({ ready: true, pending: [], plans: rows.slice(0, 8), totalOptions: rows.length, engine: engineName, nights });
  }));

  // Summit Odds: survival score for one plan, plus smaller versions that score higher.
  app.get('/api/groups/:code/odds', wrap(async (req, res) => {
    const g = group(req);
    const t = now(req);
    const { city, weekend } = req.query;
    const nights = Number(req.query.nights ?? 2);
    if (!findCity(city)) throw bad('Unknown city.');
    if (!ISO_DATE.test(String(weekend))) throw bad('weekend must be YYYY-MM-DD.');
    const rows = await rowsFor(g, t, nights);
    const result = suggestSmaller({ rows, weekend, city: findCity(city).name, nights, groupSize: g.members.length });
    if (!result) throw new HttpError(404, 'That weekend and city is not a plan the whole group can do.');
    res.json(result);
  }));

  // Plant the Flag: all signers co-sign the pact.
  app.post('/api/groups/:code/pact', wrap(async (req, res) => {
    const g = group(req);
    me(g, req);
    if (g.pact) throw new HttpError(409, 'This group already planted its flag.');
    const t = now(req);
    const city = findCity(req.body.city);
    const nights = Number(req.body.nights ?? 2);
    if (!city) throw bad('Unknown city.');
    const rows = await rowsFor(g, t, nights);
    const plan = rows.find((r) => r.weekend === req.body.weekend && r.city === city.name);
    if (!plan) throw bad('Everyone has to be free that weekend.');
    if (!plan.feasible) throw bad('That plan is too far for at least one friend.');
    const members = (await chain.signerKeys(g.members.length)).slice().sort();
    const payload = { type: 'pact', group: g.code, city: plan.city, weekend: plan.weekend, nights, members };
    const hash = fingerprint(payload);
    const sent = await chain.sendMemo({ memo: `FC1|pact|${hash}`, count: g.members.length });
    g.pact = {
      signature: sent.signature, hash, payload, custody: sent.custody, chain: chain.kind,
      url: chain.explorer(sent.signature), at: new Date().toISOString(), survival: plan.survival,
    };
    event(g, `The flag is planted! ${g.members.length} signatures for ${plan.city}, weekend of ${plan.weekend}.`);
    store.save();
    res.status(201).json(g.pact);
  }));

  app.get('/api/groups/:code/pact/verify', wrap(async (req, res) => {
    const g = group(req);
    if (!g.pact) throw new HttpError(404, 'No pact yet.');
    res.json(await verify(g.pact, 'pact'));
  }));

  async function verify(record, type) {
    const recomputed = fingerprint(record.payload);
    const check = await chain.checkMemo({
      signature: record.signature, expectedMemo: `FC1|${type}|${recomputed}`, requiredSigners: record.payload.members,
    });
    const verified = check.found && check.memoMatches && check.allSigned;
    return { verified, ...check, url: record.url, chain: record.chain, custody: record.custody };
  }

  // Summit Stamp: after the trip, everyone confirms. Streak goes up.
  app.post('/api/groups/:code/stamp', wrap(async (req, res) => {
    const g = group(req);
    me(g, req);
    if (!g.pact) throw new HttpError(409, 'Plant the flag first.');
    if (g.stamps.length) throw new HttpError(409, 'This trip is already stamped.');
    const streak = g.stamps.length + 1;
    const payload = {
      type: 'stamp', group: g.code, city: g.pact.payload.city, weekend: g.pact.payload.weekend,
      pactHash: g.pact.hash, streak, members: g.pact.payload.members,
    };
    const hash = fingerprint(payload);
    const sent = await chain.sendMemo({ memo: `FC1|stamp|${hash}`, count: g.members.length });
    const record = {
      signature: sent.signature, hash, payload, custody: sent.custody, chain: chain.kind,
      url: chain.explorer(sent.signature), at: new Date().toISOString(),
    };
    g.stamps.push(record);
    event(g, `Summit Stamp #${streak}! The group made it to ${payload.city}.`);
    store.save();
    res.status(201).json(record);
  }));

  app.get('/api/groups/:code/nudges', wrap(async (req, res) => {
    const g = group(req);
    res.json(buildNudges(g, now(req)));
  }));

  app.get('/api/groups/:code/feed', wrap(async (req, res) => res.json(group(req).feed.slice(-50))));
  app.post('/api/groups/:code/feed', wrap(async (req, res) => {
    const g = group(req);
    const m = me(g, req);
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 280) throw bad('Message must be 1 to 280 characters.');
    g.feed.push({ at: new Date().toISOString(), from: m.id, name: m.name, text });
    store.save();
    res.status(201).json(g.feed.slice(-50));
  }));

  // Demo-only: change a stored pact value to show that verification catches it.
  app.post('/api/groups/:code/debug/tamper', wrap(async (req, res) => {
    if (!allowTamper) throw new HttpError(403, 'Tamper demo is off. Set ALLOW_TAMPER_DEMO=1.');
    const g = group(req);
    if (!g.pact) throw new HttpError(404, 'No pact yet.');
    g.pact.payload.city = String(req.body.city || 'Atlantis');
    store.save();
    res.json({ tampered: true });
  }));

  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  return app;
}

async function main() {
  const env = process.env;
  let planEngine = null; let llm = null; let engineName = 'local';
  if (env.ENGINE === 'snowflake') {
    const { createSnowflakeEngine } = await import('./snowflake.mjs');
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
